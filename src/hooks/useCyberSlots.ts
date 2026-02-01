import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useBlockNumber } from 'wagmi'
import { useState, useEffect, useCallback } from 'react'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { CyberSlotsABI } from '../abi/CyberSlotsABI'

export const SpinStatus = {
  PENDING: 0,
  RESOLVED: 1,
  EXPIRED: 2,
} as const

export const WinType = {
  NONE: 0,
  TWO_OF_KIND: 1,
  SEQUENTIAL: 2,
  THREE_OF_KIND: 3,
  JACKPOT: 4,
} as const

export interface Spin {
  player: `0x${string}`
  amount: bigint
  targetBlock: bigint
  status: number
  result: [number, number, number]
  winType: number
  payout: bigint
}

export function useCyberSlots() {
  const { address } = useAccount()
  const [pendingSpinId, setPendingSpinId] = useState<bigint | null>(null)
  const [lastResult, setLastResult] = useState<{ won: boolean; result: [number, number, number]; payout: bigint; winType: number } | null>(null)
  
  const { data: blockNumber } = useBlockNumber({ watch: true })
  
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
  
  // Read pending spin for user
  const { data: pendingSpinIdData, refetch: refetchPending } = useReadContract({
    address: CONTRACTS.cyberSlots,
    abi: CyberSlotsABI,
    functionName: 'playerPendingSpinId',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })
  
  // Read pending spin details
  const { data: pendingSpinData } = useReadContract({
    address: CONTRACTS.cyberSlots,
    abi: CyberSlotsABI,
    functionName: 'spins',
    args: pendingSpinId ? [pendingSpinId] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!pendingSpinId && pendingSpinId > 0n }
  })
  
  // Check if can resolve
  const { data: canResolveData } = useReadContract({
    address: CONTRACTS.cyberSlots,
    abi: CyberSlotsABI,
    functionName: 'canResolve',
    args: pendingSpinId ? [pendingSpinId] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!pendingSpinId && pendingSpinId > 0n }
  })
  
  // Update pending spin ID
  useEffect(() => {
    if (pendingSpinIdData !== undefined) {
      const id = BigInt(pendingSpinIdData.toString())
      setPendingSpinId(id > 0n ? id : null)
    }
  }, [pendingSpinIdData])
  
  // Spin transaction
  const { writeContract: writeSpin, data: spinTxHash, isPending: isSpinning } = useWriteContract()
  const { isLoading: isSpinConfirming, isSuccess: spinConfirmed } = useWaitForTransactionReceipt({ hash: spinTxHash })
  
  // Resolve transaction
  const { writeContract: writeResolve, data: resolveTxHash, isPending: isResolving } = useWriteContract()
  const { isLoading: isResolveConfirming, isSuccess: resolveConfirmed } = useWaitForTransactionReceipt({ hash: resolveTxHash })
  
  // Refetch after spin confirmed
  useEffect(() => {
    if (spinConfirmed) {
      refetchPending()
      refetchJackpot()
      refetchStats()
    }
  }, [spinConfirmed, refetchPending, refetchJackpot, refetchStats])
  
  // Refetch after resolve confirmed
  useEffect(() => {
    if (resolveConfirmed) {
      refetchPending()
      refetchJackpot()
      refetchStats()
    }
  }, [resolveConfirmed, refetchPending, refetchJackpot, refetchStats])
  
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
  
  // Resolve spin
  const resolve = useCallback((spinId: bigint) => {
    writeResolve({
      address: CONTRACTS.cyberSlots,
      abi: CyberSlotsABI,
      functionName: 'resolve',
      args: [spinId],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeResolve])
  
  // Parse pending spin
  const pendingSpin: Spin | null = pendingSpinData ? {
    player: (pendingSpinData as any)[0],
    amount: BigInt((pendingSpinData as any)[1]),
    targetBlock: BigInt((pendingSpinData as any)[2]),
    status: Number((pendingSpinData as any)[3]),
    result: (pendingSpinData as any)[4] as [number, number, number],
    winType: Number((pendingSpinData as any)[5]),
    payout: BigInt((pendingSpinData as any)[6]),
  } : null
  
  // Parse stats
  const gameStats = stats ? {
    totalSpins: BigInt((stats as any)[0]),
    totalWagered: BigInt((stats as any)[1]),
    totalPaidOut: BigInt((stats as any)[2]),
    totalBurned: BigInt((stats as any)[3]),
    jackpotPool: BigInt((stats as any)[4]),
  } : null
  
  return {
    // State
    jackpotPool: jackpotPool ? BigInt(jackpotPool.toString()) : 0n,
    pendingSpin,
    pendingSpinId,
    lastResult,
    canResolve: !!canResolveData,
    blockNumber: blockNumber || 0n,
    gameStats,
    
    // Actions
    spin,
    resolve,
    clearResult: () => setLastResult(null),
    
    // Loading states
    isSpinning,
    isSpinConfirming,
    isResolving,
    isResolveConfirming,
    
    // Refetch
    refetchJackpot,
    refetchStats,
    refetchPending,
  }
}
