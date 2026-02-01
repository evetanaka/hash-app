import { useState, useEffect, useRef } from 'react'
import { useAccount, useBlockNumber, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther, parseAbiItem } from 'viem'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { HashGameABI } from '../abi'

interface PendingBet {
  betId: bigint
  player: `0x${string}`
  amount: bigint
  mode: number
  prediction: number
  targetBlock: bigint
  payout: bigint
}

interface ResolvedBet {
  betId: bigint
  won: boolean
  result: number
  payout: bigint
  prediction: number
  mode: number
  amount: bigint
}

const MODE_LABELS: Record<number, string> = {
  0: '1 DIGIT',
  1: '2 DIGITS',
  2: '3 DIGITS',
}

const MODE_DIGITS: Record<number, number> = {
  0: 1,
  1: 2,
  2: 3,
}

const BET_PLACED_EVENT = parseAbiItem('event BetPlaced(uint256 indexed betId, address indexed player, uint8 mode, uint16 prediction, uint256 amount, uint256 targetBlock)')

export function PendingBets() {
  const { address } = useAccount()
  const { data: blockNumber } = useBlockNumber({ watch: true, chainId: TARGET_CHAIN.id })
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN.id })
  
  const [pendingBets, setPendingBets] = useState<PendingBet[]>([])
  const [resolvedBets, setResolvedBets] = useState<ResolvedBet[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [resolvingBetId, setResolvingBetId] = useState<bigint | null>(null)
  
  // Keep track of pending bets ref for use in callbacks
  const pendingBetsRef = useRef<PendingBet[]>([])
  pendingBetsRef.current = pendingBets

  // Resolve bet
  const { writeContract, data: resolveHash, isPending: isResolving, reset: resetWrite } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isResolved, data: receipt } = useWaitForTransactionReceipt({ hash: resolveHash })

  // When resolve TX is confirmed, check the result
  useEffect(() => {
    const checkResolveResult = async () => {
      if (isResolved && receipt && resolvingBetId !== null && publicClient) {
        // Find the bet we were resolving
        const bet = pendingBetsRef.current.find(b => b.betId === resolvingBetId)
        
        if (bet) {
          try {
            // Get the updated bet status from chain
            const betData = await publicClient.readContract({
              address: CONTRACTS.hashGame,
              abi: HashGameABI,
              functionName: 'getBet',
              args: [resolvingBetId],
            }) as any[]
            
            const status = Number(betData[5])
            // 1 = WON, 2 = LOST
            if (status === 1 || status === 2) {
              const won = status === 1
              // Calculate result from last transaction logs or estimate
              // For now, use prediction as placeholder - actual result would come from event
              
              // Parse BetResolved event from receipt logs
              for (const log of receipt.logs) {
                try {
                  if (log.address.toLowerCase() === CONTRACTS.hashGame.toLowerCase()) {
                    // Check if this is a BetResolved event (topic[0])
                    // Actually just extract result from log data
                    if (log.topics.length >= 2) {
                      const logBetId = BigInt(log.topics[1] || 0)
                      if (logBetId === resolvingBetId && log.data.length >= 130) {
                        // Extract result from log data (offset 64-128 is result)
                        const actualResult = parseInt(log.data.slice(66, 130), 16)
                        setResolvedBets(prev => [...prev, {
                          betId: resolvingBetId,
                          won,
                          result: actualResult,
                          payout: won ? bet.payout : 0n,
                          prediction: bet.prediction,
                          mode: bet.mode,
                          amount: bet.amount,
                        }])
                        setPendingBets(prev => prev.filter(b => b.betId !== resolvingBetId))
                        
                        // Auto-remove after 5 seconds
                        const resolvedId = resolvingBetId
                        setTimeout(() => {
                          setResolvedBets(prev => prev.filter(b => b.betId !== resolvedId))
                        }, 5000)
                        
                        setResolvingBetId(null)
                        resetWrite()
                        return
                      }
                    }
                  }
                } catch {}
              }
              
              // Fallback: just use the status we got
              setResolvedBets(prev => [...prev, {
                betId: resolvingBetId,
                won,
                result: bet.prediction, // We'll show actual result from chain
                payout: won ? bet.payout : 0n,
                prediction: bet.prediction,
                mode: bet.mode,
                amount: bet.amount,
              }])
              setPendingBets(prev => prev.filter(b => b.betId !== resolvingBetId))
              
              const resolvedId = resolvingBetId
              setTimeout(() => {
                setResolvedBets(prev => prev.filter(b => b.betId !== resolvedId))
              }, 5000)
            }
          } catch (err) {
            console.error('Error checking resolve result:', err)
          }
        }
        
        setResolvingBetId(null)
        resetWrite()
      }
    }
    
    checkResolveResult()
  }, [isResolved, receipt, resolvingBetId, publicClient, resetWrite])

  // Fetch pending bets from chain
  useEffect(() => {
    const fetchPendingBets = async () => {
      if (!address || !publicClient) {
        setPendingBets([])
        return
      }

      // Don't refetch while resolving
      if (resolvingBetId !== null) return

      setIsLoading(true)
      
      try {
        const currentBlock = await publicClient.getBlockNumber()
        const DEPLOYMENT_BLOCK = 10165750n
        const fromBlock = currentBlock > DEPLOYMENT_BLOCK + 900n ? currentBlock - 900n : DEPLOYMENT_BLOCK

        const logs = await publicClient.getLogs({
          address: CONTRACTS.hashGame,
          event: BET_PLACED_EVENT,
          args: { player: address },
          fromBlock,
          toBlock: 'latest',
        })

        const pending: PendingBet[] = []
        
        for (const log of logs) {
          const args = log.args as any
          const betId = args.betId
          
          // Skip if this bet is in resolved list
          if (resolvedBets.some(r => r.betId === betId)) continue
          
          try {
            const betData = await publicClient.readContract({
              address: CONTRACTS.hashGame,
              abi: HashGameABI,
              functionName: 'getBet',
              args: [betId],
            }) as any[]
            
            const status = Number(betData[5])
            
            if (status === 0) { // PENDING
              pending.push({
                betId,
                player: args.player,
                amount: args.amount,
                mode: Number(args.mode),
                prediction: Number(args.prediction),
                targetBlock: args.targetBlock,
                payout: BigInt(betData[7] || 0),
              })
            }
          } catch (err) {
            console.error('Error checking bet status:', betId, err)
          }
        }

        pending.sort((a, b) => Number(b.betId - a.betId))
        setPendingBets(pending)
      } catch (err) {
        console.error('Error fetching pending bets:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPendingBets()
    
    const interval = setInterval(fetchPendingBets, 15000) // Every 15 seconds
    return () => clearInterval(interval)
  }, [address, publicClient, resolvedBets, resolvingBetId])

  // Resolve a specific bet
  const handleResolve = (betId: bigint) => {
    if (resolvingBetId !== null) return // Prevent double-click
    
    setResolvingBetId(betId)
    writeContract({
      address: CONTRACTS.hashGame,
      abi: HashGameABI,
      functionName: 'resolveBet',
      args: [betId],
      chainId: TARGET_CHAIN.id,
    })
  }

  if (!address) {
    return null
  }

  const currentBlock = blockNumber ?? 0n
  const hasBets = pendingBets.length > 0 || resolvedBets.length > 0

  if (isLoading && pendingBets.length === 0 && resolvedBets.length === 0) {
    return (
      <div className="border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <h3 className="font-bold text-cyan-400 text-sm tracking-wider">BETS</h3>
        </div>
        
        <div className="text-center py-4">
          <div className="text-gray-600 text-2xl mb-2 animate-pulse">⏳</div>
          <div className="text-gray-500 text-sm">Loading pending bets...</div>
          <div className="text-gray-600 text-xs mt-1">Checking on-chain data</div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-3 bg-cyan-600 animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-3 bg-cyan-600 animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-3 bg-cyan-600 animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <span>Current block: <span className="text-cyan-400 font-mono">#{currentBlock.toString()}</span></span>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-cyan-500/30 bg-cyan-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${hasBets ? 'bg-cyan-400 animate-pulse' : 'bg-gray-600'}`} />
        <h3 className="font-bold text-cyan-400 text-sm tracking-wider">
          {pendingBets.length > 0 ? `PENDING BETS (${pendingBets.length})` : 'BETS'}
        </h3>
      </div>

      {/* Empty state */}
      {!hasBets && (
        <div className="text-center py-4">
          <div className="text-gray-600 text-2xl mb-2">📭</div>
          <div className="text-gray-500 text-sm">No pending bets</div>
          <div className="text-gray-600 text-xs mt-1">Place a bet to see it here</div>
        </div>
      )}

      <div className="space-y-3">
        {/* RESOLVED BETS (temporary display) */}
        {resolvedBets.map((bet) => (
          <div 
            key={`resolved-${bet.betId.toString()}`} 
            className={`border p-4 ${
              bet.won 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-red-500 bg-red-500/10'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className={`text-2xl font-black ${bet.won ? 'text-green-400' : 'text-red-400'}`}>
                  {bet.won ? '🎉 WIN!' : '💀 LOST'}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Bet #{bet.betId.toString()} • {MODE_LABELS[bet.mode]}
                </div>
              </div>
              <div className="text-right">
                {bet.won ? (
                  <div className="text-xl font-bold text-green-400">
                    +{Number(formatEther(bet.payout)).toLocaleString()} $HASH
                  </div>
                ) : (
                  <div className="text-xl font-bold text-red-400">
                    -{Number(formatEther(bet.amount)).toLocaleString()} $HASH
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>Your pick: <span className="text-white font-mono">{bet.prediction.toString(16).toUpperCase().padStart(MODE_DIGITS[bet.mode], '0')}</span></span>
              <span>Result: <span className={bet.won ? 'text-green-400' : 'text-red-400'}>{bet.result.toString(16).toUpperCase().padStart(MODE_DIGITS[bet.mode], '0')}</span></span>
            </div>
          </div>
        ))}

        {/* PENDING BETS */}
        {pendingBets.map((bet) => {
          const blocksRemaining = bet.targetBlock > currentBlock ? Number(bet.targetBlock - currentBlock) : 0
          const canResolve = currentBlock >= bet.targetBlock
          const isThisBetResolving = resolvingBetId === bet.betId
          const totalBlocks = 5
          const progress = Math.min(100, Math.max(0, ((totalBlocks - blocksRemaining) / totalBlocks) * 100))

          return (
            <div key={bet.betId.toString()} className="border border-white/10 bg-black/50 p-3">
              {/* Header */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs text-gray-500">BET #{bet.betId.toString()}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-mono">
                      {bet.prediction.toString(16).toUpperCase().padStart(MODE_DIGITS[bet.mode], '0')}
                    </span>
                    <span className="text-xs text-gray-400">{MODE_LABELS[bet.mode]}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{Number(formatEther(bet.amount)).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">$HASH</div>
                </div>
              </div>

              {/* Block Progress */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Target Block</span>
                  <span className="text-white font-mono">#{bet.targetBlock.toString()}</span>
                </div>
                
                <div className="relative h-6 bg-black border border-white/20 overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/50 to-cyan-400/50 transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                  
                  <div className="absolute inset-0 flex items-center justify-center gap-1">
                    {[...Array(5)].map((_, i) => {
                      const filled = i < Math.ceil(progress / 20)
                      return (
                        <div 
                          key={i}
                          className={`w-3 h-3 border transition-all duration-300 ${
                            filled ? 'bg-cyan-400 border-cyan-400' : 'border-gray-600'
                          } ${!filled && i === Math.ceil(progress / 20) ? 'animate-pulse' : ''}`}
                        />
                      )
                    })}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-end pr-2">
                    <span className="text-xs font-mono">
                      {canResolve ? (
                        <span className="text-green-400 font-bold">✓ READY</span>
                      ) : (
                        <span className="text-gray-400">{blocksRemaining} blocks</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Potential Win */}
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-gray-500">Potential Win:</span>
                <span className="text-green-400 font-bold">
                  {Number(formatEther(bet.payout)).toLocaleString()} $HASH
                </span>
              </div>

              {/* Resolve Button */}
              {canResolve && (
                <button
                  onClick={() => handleResolve(bet.betId)}
                  disabled={isThisBetResolving || isResolving || isConfirming}
                  className="w-full py-2 font-bold border border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isThisBetResolving && (isResolving || isConfirming)
                    ? '⏳ RESOLVING...' 
                    : '🎲 REVEAL RESULT'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Block Mining Animation */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <div className="flex gap-0.5">
          <span className="w-1.5 h-3 bg-cyan-600 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-3 bg-cyan-600 animate-pulse" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-3 bg-cyan-600 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
        <span>Current block: <span className="text-cyan-400 font-mono">#{currentBlock.toString()}</span></span>
      </div>
    </div>
  )
}
