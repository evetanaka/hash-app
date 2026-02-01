import { useState, useEffect } from 'react'
import { useAccount, useBlockNumber, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi'
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

  // Resolve bet
  const { writeContract, data: resolveHash, isPending: isResolving } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isResolved } = useWaitForTransactionReceipt({ hash: resolveHash })
  
  // Watch for BetResolved events
  useWatchContractEvent({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    eventName: 'BetResolved',
    onLogs(logs) {
      for (const log of logs) {
        const args = (log as any).args
        if (!args || args.player?.toLowerCase() !== address?.toLowerCase()) continue
        
        // Find the pending bet to get prediction and mode
        const pendingBet = pendingBets.find(b => b.betId === args.betId)
        if (pendingBet) {
          const resolvedBetId = args.betId
          // Add to resolved bets
          setResolvedBets(prev => [...prev, {
            betId: resolvedBetId,
            won: args.won,
            result: Number(args.result),
            payout: args.payout,
            prediction: pendingBet.prediction,
            mode: pendingBet.mode,
            amount: pendingBet.amount,
          }])
          // Remove from pending
          setPendingBets(prev => prev.filter(b => b.betId !== resolvedBetId))
          setResolvingBetId(null)
          
          // Auto-remove resolved bet after 5 seconds
          setTimeout(() => {
            setResolvedBets(prev => prev.filter(b => b.betId !== resolvedBetId))
          }, 5000)
        }
      }
    },
  })

  // Fetch pending bets from BetPlaced events then check their status on-chain
  useEffect(() => {
    const fetchPendingBets = async () => {
      if (!address || !publicClient) {
        setPendingBets([])
        return
      }

      setIsLoading(true)
      
      try {
        const currentBlock = await publicClient.getBlockNumber()
        // Look back ~1000 blocks max (RPC limit), but start from deployment
        const DEPLOYMENT_BLOCK = 10165750n
        const fromBlock = currentBlock > DEPLOYMENT_BLOCK + 900n ? currentBlock - 900n : DEPLOYMENT_BLOCK

        // Get BetPlaced events for this user
        const logs = await publicClient.getLogs({
          address: CONTRACTS.hashGame,
          event: BET_PLACED_EVENT,
          args: { player: address },
          fromBlock,
          toBlock: 'latest',
        })

        // Check each bet's current status
        const pending: PendingBet[] = []
        
        for (const log of logs) {
          const args = log.args as any
          const betId = args.betId
          
          try {
            // Get current bet state from contract
            const betData = await publicClient.readContract({
              address: CONTRACTS.hashGame,
              abi: HashGameABI,
              functionName: 'getBet',
              args: [betId],
            }) as any[]
            
            const status = Number(betData[5])
            
            // 0 = PENDING
            if (status === 0) {
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

        // Sort by betId descending (newest first)
        pending.sort((a, b) => Number(b.betId - a.betId))
        setPendingBets(pending)
      } catch (err) {
        console.error('Error fetching pending bets:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPendingBets()
    
    // Refetch every 12 seconds (new block)
    const interval = setInterval(fetchPendingBets, 12000)
    return () => clearInterval(interval)
  }, [address, publicClient, isResolved])

  // Resolve a specific bet
  const handleResolve = (betId: bigint) => {
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

  if (isLoading && pendingBets.length === 0) {
    return (
      <div className="border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-sm text-gray-400">Loading pending bets...</span>
        </div>
      </div>
    )
  }

  // Always show the block, even when empty

  const currentBlock = blockNumber ?? 0n

  const hasBets = pendingBets.length > 0 || resolvedBets.length > 0

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
            className={`border p-4 animate-pulse ${
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
        {pendingBets.map((bet) => {
          const blocksRemaining = bet.targetBlock > currentBlock ? Number(bet.targetBlock - currentBlock) : 0
          const canResolve = currentBlock >= bet.targetBlock
          const totalBlocks = 5 // BLOCKS_TO_WAIT + some buffer
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
                
                {/* Progress Bar with Block Animation */}
                <div className="relative h-6 bg-black border border-white/20 overflow-hidden">
                  {/* Progress fill */}
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/50 to-cyan-400/50 transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                  
                  {/* Block icons animation */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1">
                    {[...Array(5)].map((_, i) => {
                      const filled = i < Math.ceil(progress / 20)
                      return (
                        <div 
                          key={i}
                          className={`w-3 h-3 border transition-all duration-300 ${
                            filled
                              ? 'bg-cyan-400 border-cyan-400' 
                              : 'border-gray-600'
                          } ${!filled && i === Math.ceil(progress / 20) ? 'animate-pulse' : ''}`}
                        />
                      )
                    })}
                  </div>

                  {/* Remaining text */}
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
                  disabled={isResolving || isConfirming}
                  className="w-full py-2 font-bold border border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-colors text-sm disabled:opacity-50"
                >
                  {(isResolving || isConfirming) && resolvingBetId === bet.betId 
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
