import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { useCallback } from 'react'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { HashJackpotABI } from '../abi'

export interface JackpotStats {
  pot: bigint
  nextDropTime: bigint
  totalPaidOut: bigint
  streakWinsCount: bigint
  mustDropCount: bigint
  stakersCount: bigint
}

export function useHashJackpot() {
  const { address } = useAccount()

  // Read jackpot stats
  const { data: statsData, refetch: refetchStats } = useReadContract({
    address: CONTRACTS.hashJackpot,
    abi: HashJackpotABI,
    functionName: 'getStats',
    chainId: TARGET_CHAIN.id,
  })

  // Read current pot
  const { data: currentPotData, refetch: refetchPot } = useReadContract({
    address: CONTRACTS.hashJackpot,
    abi: HashJackpotABI,
    functionName: 'currentPot',
    chainId: TARGET_CHAIN.id,
  })

  // Check if user is registered staker
  const { data: isRegisteredData } = useReadContract({
    address: CONTRACTS.hashJackpot,
    abi: HashJackpotABI,
    functionName: 'isRegistered',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  // Get lottery odds for user
  const { data: oddsData, refetch: refetchOdds } = useReadContract({
    address: CONTRACTS.hashJackpot,
    abi: HashJackpotABI,
    functionName: 'getLotteryOdds',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  // Check if must-drop can be triggered
  const { data: canTriggerData, refetch: refetchCanTrigger } = useReadContract({
    address: CONTRACTS.hashJackpot,
    abi: HashJackpotABI,
    functionName: 'canTriggerMustDrop',
    chainId: TARGET_CHAIN.id,
  })

  // Trigger must-drop
  const { 
    writeContract: writeTriggerMustDrop, 
    data: triggerHash, 
    isPending: isTriggering,
    error: triggerError 
  } = useWriteContract()

  const { isLoading: isTriggerConfirming, isSuccess: isTriggerConfirmed } = useWaitForTransactionReceipt({
    hash: triggerHash,
  })

  const triggerMustDrop = useCallback(() => {
    writeTriggerMustDrop({
      address: CONTRACTS.hashJackpot,
      abi: HashJackpotABI,
      functionName: 'triggerMustDrop',
      args: [],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeTriggerMustDrop])

  const stats: JackpotStats | null = statsData ? {
    pot: BigInt((statsData as any)[0] || 0),
    nextDropTime: BigInt((statsData as any)[1] || 0),
    totalPaidOut: BigInt((statsData as any)[2] || 0),
    streakWinsCount: BigInt((statsData as any)[3] || 0),
    mustDropCount: BigInt((statsData as any)[4] || 0),
    stakersCount: BigInt((statsData as any)[5] || 0),
  } : null

  const currentPot = currentPotData ? BigInt(currentPotData.toString()) : 0n
  const isRegistered = isRegisteredData ?? false
  const lotteryOdds = oddsData ? Number(oddsData) / 100 : 0 // Odds in percentage

  const canTrigger = canTriggerData ? {
    ready: (canTriggerData as any)[0],
    timeRemaining: BigInt((canTriggerData as any)[1] || 0),
    potAmount: BigInt((canTriggerData as any)[2] || 0),
  } : null

  return {
    // State
    stats,
    currentPot,
    formattedPot: formatEther(currentPot),
    isRegistered,
    lotteryOdds,
    canTrigger,
    
    // Actions
    triggerMustDrop,
    
    // TX states
    isTriggering,
    isTriggerConfirming,
    isTriggerConfirmed,
    triggerError,
    
    // Refetch
    refetchStats,
    refetchPot,
    refetchOdds,
    refetchCanTrigger,
    refetchAll: () => {
      refetchStats()
      refetchPot()
      refetchOdds()
      refetchCanTrigger()
    }
  }
}
