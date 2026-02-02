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

export interface RespinInfo {
  eligible: boolean
  originalSpinId: bigint
  originalResult: [number, number, number]
  blocksRemaining: bigint
  cost1Lock: bigint
  cost2Lock: bigint
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
  
  // Respin transaction
  const { writeContract: writeRespin, data: respinTxHash, isPending: isRespinning, reset: resetRespin } = useWriteContract()
  const { data: respinReceipt, isLoading: isRespinConfirming, isSuccess: respinConfirmed } = useWaitForTransactionReceipt({ hash: respinTxHash })
  
  // Check if player can respin
  const { data: canRespinData, refetch: refetchCanRespin } = useReadContract({
    address: CONTRACTS.cyberSlots,
    abi: CyberSlotsABI,
    functionName: 'canRespin',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })
  
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
      refetchCanRespin()
    }
  }, [spinReceipt, spinConfirmed, refetchJackpot, refetchStats, refetchHistory, refetchCanRespin])
  
  // Parse respin result from transaction receipt
  useEffect(() => {
    if (respinReceipt && respinConfirmed) {
      // Find Respin or SpinCompleted event in logs
      for (const log of respinReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: CyberSlotsABI,
            data: log.data,
            topics: log.topics,
          })
          
          if (decoded.eventName === 'Respin') {
            const args = decoded.args as any
            setLastResult({
              spinId: args.newSpinId,
              result: args.newResult as [number, number, number],
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
      refetchCanRespin()
    }
  }, [respinReceipt, respinConfirmed, refetchJackpot, refetchStats, refetchHistory, refetchCanRespin])
  
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
  
  // Lock and respin
  const lockAndRespin = useCallback((lockReel0: boolean, lockReel1: boolean, lockReel2: boolean) => {
    setLastResult(null)
    writeRespin({
      address: CONTRACTS.cyberSlots,
      abi: CyberSlotsABI,
      functionName: 'lockAndRespin',
      args: [lockReel0, lockReel1, lockReel2],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeRespin])
  
  // Parse canRespin data
  const respinInfo: RespinInfo | null = canRespinData ? {
    eligible: (canRespinData as any)[0],
    originalSpinId: BigInt((canRespinData as any)[1]),
    originalResult: (canRespinData as any)[2] as [number, number, number],
    blocksRemaining: BigInt((canRespinData as any)[3]),
    cost1Lock: BigInt((canRespinData as any)[4]),
    cost2Lock: BigInt((canRespinData as any)[5]),
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
    respinInfo,
    
    // Actions
    spin,
    lockAndRespin,
    clearResult: () => setLastResult(null),
    resetSpin,
    resetRespin,
    
    // Loading states
    isSpinning,
    isSpinConfirming,
    isRespinning,
    isRespinConfirming,
    
    // Refetch
    refetchJackpot,
    refetchStats,
    refetchCanRespin,
  }
}
