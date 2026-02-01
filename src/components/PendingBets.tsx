import { useState, useEffect } from 'react'
import { useAccount, useBlockNumber, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther } from 'viem'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { HashGameABI } from '../abi'
import { GameMode, BetStatus } from '../hooks/useHashGame'

interface PendingBet {
  betId: bigint
  player: `0x${string}`
  amount: bigint
  mode: GameMode
  prediction: number
  targetBlock: bigint
  status: BetStatus
  payout: bigint
}

const MODE_LABELS = {
  [GameMode.ONE_DIGIT]: '1 DIGIT',
  [GameMode.TWO_DIGIT]: '2 DIGITS',
  [GameMode.THREE_DIGIT]: '3 DIGITS',
}

const MODE_DIGITS = {
  [GameMode.ONE_DIGIT]: 1,
  [GameMode.TWO_DIGIT]: 2,
  [GameMode.THREE_DIGIT]: 3,
}

export function PendingBets() {
  const { address } = useAccount()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const [pendingBets, setPendingBets] = useState<PendingBet[]>([])

  // Get next bet ID to know how many bets exist
  const { data: nextBetIdRaw } = useReadContract({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    functionName: 'nextBetId',
    chainId: TARGET_CHAIN.id,
  })
  
  const nextBetId = nextBetIdRaw ? BigInt(nextBetIdRaw.toString()) : 0n

  // Resolve bet
  const { writeContract, data: resolveHash, isPending: isResolving } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: resolveHash })

  // Fetch pending bets for current user
  useEffect(() => {
    const fetchPendingBets = async () => {
      if (!address || nextBetId === 0n) {
        setPendingBets([])
        return
      }

      const pending: PendingBet[] = []

      // Check last 50 bets (optimization)
      const startId = nextBetId > 50n ? nextBetId - 50n : 0n
      
      for (let i = nextBetId - 1n; i >= startId; i--) {
        try {
          const response = await fetch(
            `https://ethereum-sepolia-rpc.publicnode.com`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [{
                  to: CONTRACTS.hashGame,
                  data: `0x2ec892a9${i.toString(16).padStart(64, '0')}` // getBet(uint256)
                }, 'latest']
              })
            }
          )
          const data = await response.json()
          
          if (data.result && data.result !== '0x') {
            // Decode the result
            const result = data.result.slice(2)
            const player = '0x' + result.slice(24, 64) as `0x${string}`
            const amount = BigInt('0x' + result.slice(64, 128))
            const mode = parseInt(result.slice(128, 192), 16) as GameMode
            const prediction = parseInt(result.slice(192, 256), 16)
            const targetBlock = BigInt('0x' + result.slice(256, 320))
            const status = parseInt(result.slice(320, 384), 16) as BetStatus
            const payout = BigInt('0x' + result.slice(448, 512))

            // Only add if it's the user's bet and pending
            if (player.toLowerCase() === address.toLowerCase() && status === BetStatus.PENDING) {
              pending.push({
                betId: i,
                player,
                amount,
                mode,
                prediction,
                targetBlock,
                status,
                payout,
              })
            }
          }
        } catch (err) {
          console.error('Error fetching bet', i, err)
        }
      }

      setPendingBets(pending)
    }

    fetchPendingBets()
  }, [address, nextBetId])

  // Resolve a specific bet
  const handleResolve = (betId: bigint) => {
    writeContract({
      address: CONTRACTS.hashGame,
      abi: HashGameABI,
      functionName: 'resolveBet',
      args: [betId],
      chainId: TARGET_CHAIN.id,
    })
  }

  if (!address || pendingBets.length === 0) {
    return null
  }

  const currentBlock = blockNumber ?? 0n

  return (
    <div className="border border-cyan-500/30 bg-cyan-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <h3 className="font-bold text-cyan-400 text-sm tracking-wider">PENDING BETS</h3>
      </div>

      <div className="space-y-3">
        {pendingBets.map((bet) => {
          const blocksRemaining = bet.targetBlock > currentBlock ? Number(bet.targetBlock - currentBlock) : 0
          const canResolve = currentBlock >= bet.targetBlock
          const progress = blocksRemaining > 0 ? Math.max(0, 100 - (blocksRemaining / 5) * 100) : 100

          return (
            <div key={bet.betId.toString()} className="border border-white/10 bg-black/50 p-3">
              {/* Header */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs text-gray-500">BET #{bet.betId.toString()}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">
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
                  <span className="text-white">#{bet.targetBlock.toString()}</span>
                </div>
                
                {/* Progress Bar with Block Animation */}
                <div className="relative h-6 bg-black border border-white/20 overflow-hidden">
                  {/* Progress fill */}
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/50 to-cyan-400/50 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                  
                  {/* Block icons animation */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i}
                        className={`w-3 h-3 border transition-all duration-300 ${
                          i < Math.ceil((5 - blocksRemaining)) 
                            ? 'bg-cyan-400 border-cyan-400' 
                            : 'border-gray-600 animate-pulse'
                        }`}
                        style={{ animationDelay: `${i * 100}ms` }}
                      />
                    ))}
                  </div>

                  {/* Remaining text */}
                  <div className="absolute inset-0 flex items-center justify-end pr-2">
                    <span className="text-xs font-mono">
                      {canResolve ? (
                        <span className="text-green-400">READY</span>
                      ) : (
                        <span className="text-gray-400">{blocksRemaining} blocks</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Potential Win */}
              <div className="flex justify-between items-center text-xs">
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
                  className="w-full mt-3 py-2 font-bold border border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-colors text-sm disabled:opacity-50"
                >
                  {isResolving || isConfirming ? 'RESOLVING...' : '🎲 REVEAL RESULT'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Block Mining Animation */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <div className="flex gap-0.5">
          <span className="w-1.5 h-3 bg-gray-600 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-3 bg-gray-600 animate-pulse" style={{ animationDelay: '100ms' }} />
          <span className="w-1.5 h-3 bg-gray-600 animate-pulse" style={{ animationDelay: '200ms' }} />
        </div>
        <span>Block #{currentBlock.toString()} mining...</span>
      </div>
    </div>
  )
}
