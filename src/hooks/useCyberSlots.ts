import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { useState, useEffect, useCallback } from 'react'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { CyberSlotsABI } from '../abi/CyberSlotsABI'
import { decodeEventLog } from 'viem'

export const WinType = {
  NONE: 0,
  TWO_OF_KIND: 1,
  SEQUENTIAL: 2,
  THREE_OF_KIND: 3,
  JACKPOT: 4,
} as const

export interface SpinResult {
  spinId: bigint
  result: [number, number, number]
  winType: number
  payout: bigint
}

export interface SpinHistory {
  player: string
  amount: bigint
  result: [number, number, number]
  winType: number
  payout: bigint
  timestamp: bigint
}

export function useCyberSlots() {
  const { address } = useAccount()
  const [lastResult, setLastResult] = useState<SpinResult | null>(null)
  
  // Read jackpot pool
  const { data: jackpotPool, refetch: refetchJackpot } = useReadContract({
    address: CONTRACTS.cyberSlots,
    abi: CyberSlotsABI,
    functionName: 'jackpotPool',
    chainId: TARGET_CHAIN.id,
  })
  
  // Read stats
  const { data: stats, refetch: refetchStats } = useReadContract({
    address: CONTRACTS.cyberSlots,
    abi: CyberSlotsABI,
    functionName: 'getStats',
    chainId: TARGET_CHAIN.id,
  })
  
  // Read player spin history
  const { data: spinHistoryData, refetch: refetchHistory } = useReadContract({
    address: CONTRACTS.cyberSlots,
    abi: CyberSlotsABI,
    functionName: 'getPlayerSpins',
    args: address ? [address, BigInt(10), BigInt(0)] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })
  
  // Spin transaction
  const { writeContract: writeSpin, data: spinTxHash, isPending: isSpinning, reset: resetSpin } = useWriteContract()
  const { data: spinReceipt, isLoading: isSpinConfirming, isSuccess: spinConfirmed } = useWaitForTransactionReceipt({ hash: spinTxHash })
  
  // Parse spin result from transaction receipt
  useEffect(() => {
    if (spinReceipt && spinConfirmed) {
      // Find SpinCompleted event in logs
      for (const log of spinReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: CyberSlotsABI,
            data: log.data,
            topics: log.topics,
          })
          
          if (decoded.eventName === 'SpinCompleted') {
            const args = decoded.args as any
            setLastResult({
              spinId: args.spinId,
              result: args.result as [number, number, number],
              winType: Number(args.winType),
              payout: args.payout,
            })
            break
          }
        } catch {
          // Not our event, continue
        }
      }
      
      refetchJackpot()
      refetchStats()
      refetchHistory()
    }
  }, [spinReceipt, spinConfirmed, refetchJackpot, refetchStats, refetchHistory])
  
  // Place spin
  const spin = useCallback((amount: bigint) => {
    setLastResult(null)
    writeSpin({
      address: CONTRACTS.cyberSlots,
      abi: CyberSlotsABI,
      functionName: 'spin',
      args: [amount],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeSpin])
  
  // Parse stats
  const gameStats = stats ? {
    totalSpins: BigInt((stats as any)[0]),
    totalWagered: BigInt((stats as any)[1]),
    totalPaidOut: BigInt((stats as any)[2]),
    totalBurned: BigInt((stats as any)[3]),
    jackpotPool: BigInt((stats as any)[4]),
  } : null
  
  // Parse spin history
  const spinHistory: SpinHistory[] = spinHistoryData ? (spinHistoryData as any[]).map((s: any) => ({
    player: s.player,
    amount: BigInt(s.amount),
    result: s.result as [number, number, number],
    winType: Number(s.winType),
    payout: BigInt(s.payout),
    timestamp: BigInt(s.timestamp),
  })) : []
  
  return {
    // State
    jackpotPool: jackpotPool ? BigInt(jackpotPool.toString()) : 0n,
    lastResult,
    gameStats,
    spinHistory,
    
    // Actions
    spin,
    clearResult: () => setLastResult(null),
    resetSpin,
    
    // Loading states
    isSpinning,
    isSpinConfirming,
    
    // Refetch
    refetchJackpot,
    refetchStats,
  }
}
