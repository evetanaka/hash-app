import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { useState, useEffect, useCallback } from 'react'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { CyberSlotsABI } from '../abi/CyberSlotsABI'
import { decodeEventLog } from 'viem'

export interface SpinResult {
  spinId: bigint
  grid: number[]  // 9 elements
  maxMatch: number
  linesHit: number
  isJackpot: boolean
  payout: bigint
}

export interface SpinHistory {
  player: string
  amount: bigint
  grid: number[]
  maxMatch: number
  linesHit: number
  isJackpot: boolean
  payout: bigint
  timestamp: bigint
}

export interface PayoutConfig {
  match3: bigint
  match4: bigint
  match5: bigint
  match6: bigint
  match7: bigint
  match8: bigint
  line3: bigint
}

export function useCyberSlots() {
  const { address } = useAccount()
  const [lastResult, setLastResult] = useState<SpinResult | null>(null)
  
  // Read jackpot pool
  const { data: jackpotPool, refetch: refetchJackpot } = useReadContract({
    address: CONTRACTS.cyberSlots,
    abi: CyberSlotsABI,
    functionName: 'getJackpotPool',
    chainId: TARGET_CHAIN.id,
  })
  
  // Read stats
  const { data: stats, refetch: refetchStats } = useReadContract({
    address: CONTRACTS.cyberSlots,
    abi: CyberSlotsABI,
    functionName: 'getStats',
    chainId: TARGET_CHAIN.id,
  })
  
  // Read payout config
  const { data: payoutsData } = useReadContract({
    address: CONTRACTS.cyberSlots,
    abi: CyberSlotsABI,
    functionName: 'getPayouts',
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
              grid: Array.from(args.grid).map(Number),
              maxMatch: Number(args.maxMatch),
              linesHit: Number(args.linesHit),
              isJackpot: args.maxMatch === 9 && args.grid.every((s: number) => s === 15),
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
  
  // Parse payout config
  const payoutConfig: PayoutConfig | null = payoutsData ? {
    match3: BigInt((payoutsData as any).match3),
    match4: BigInt((payoutsData as any).match4),
    match5: BigInt((payoutsData as any).match5),
    match6: BigInt((payoutsData as any).match6),
    match7: BigInt((payoutsData as any).match7),
    match8: BigInt((payoutsData as any).match8),
    line3: BigInt((payoutsData as any).line3),
  } : null
  
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
    grid: Array.from(s.grid).map(Number),
    maxMatch: Number(s.maxMatch),
    linesHit: Number(s.linesHit),
    isJackpot: s.isJackpot,
    payout: BigInt(s.payout),
    timestamp: BigInt(s.timestamp),
  })) : []
  
  return {
    // State
    jackpotPool: jackpotPool ? BigInt(jackpotPool.toString()) : 0n,
    lastResult,
    gameStats,
    spinHistory,
    payoutConfig,
    
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
