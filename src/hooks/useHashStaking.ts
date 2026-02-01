import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { useCallback } from 'react'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { HashStakingABI } from '../abi'

export interface StakeInfo {
  amount: bigint
  lockEnd: bigint
  isLocked: boolean
  daysRemaining: bigint
}

export interface TierInfo {
  tier: number
  boostBps: number
  maxBetUsd: bigint
  referralFeeBps: number
}

export interface GlobalStats {
  totalStaked: bigint
  rewardPool: bigint
  accRewardPerShare: bigint
}

const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']

export function useHashStaking() {
  const { address } = useAccount()

  // Read stake info
  const { data: stakeInfoData, refetch: refetchStakeInfo } = useReadContract({
    address: CONTRACTS.hashStaking,
    abi: HashStakingABI,
    functionName: 'getStakeInfo',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  // Read tier info
  const { data: tierInfoData, refetch: refetchTierInfo } = useReadContract({
    address: CONTRACTS.hashStaking,
    abi: HashStakingABI,
    functionName: 'getUserTierInfo',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  // Read global stats
  const { data: globalStatsData, refetch: refetchGlobalStats } = useReadContract({
    address: CONTRACTS.hashStaking,
    abi: HashStakingABI,
    functionName: 'getGlobalStats',
    chainId: TARGET_CHAIN.id,
  })

  // Read pending rewards
  const { data: pendingRewardsData, refetch: refetchRewards } = useReadContract({
    address: CONTRACTS.hashStaking,
    abi: HashStakingABI,
    functionName: 'pendingRewards',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  // Read referrer
  const { data: referrerData } = useReadContract({
    address: CONTRACTS.hashStaking,
    abi: HashStakingABI,
    functionName: 'referrers',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  // Read lock duration
  const { data: lockDurationData } = useReadContract({
    address: CONTRACTS.hashStaking,
    abi: HashStakingABI,
    functionName: 'LOCK_DURATION',
    chainId: TARGET_CHAIN.id,
  })

  // Stake
  const { 
    writeContract: writeStake, 
    data: stakeHash, 
    isPending: isStaking,
    error: stakeError 
  } = useWriteContract()

  const { isLoading: isStakeConfirming, isSuccess: isStakeConfirmed } = useWaitForTransactionReceipt({
    hash: stakeHash,
  })

  // Add to stake
  const { 
    writeContract: writeAddStake, 
    data: addStakeHash, 
    isPending: isAddingStake,
    error: addStakeError 
  } = useWriteContract()

  const { isLoading: isAddStakeConfirming, isSuccess: isAddStakeConfirmed } = useWaitForTransactionReceipt({
    hash: addStakeHash,
  })

  // Unstake
  const { 
    writeContract: writeUnstake, 
    data: unstakeHash, 
    isPending: isUnstaking,
    error: unstakeError 
  } = useWriteContract()

  const { isLoading: isUnstakeConfirming, isSuccess: isUnstakeConfirmed } = useWaitForTransactionReceipt({
    hash: unstakeHash,
  })

  // Emergency unstake
  const { 
    writeContract: writeEmergencyUnstake, 
    data: emergencyUnstakeHash, 
    isPending: isEmergencyUnstaking 
  } = useWriteContract()

  const { isLoading: isEmergencyUnstakeConfirming, isSuccess: isEmergencyUnstakeConfirmed } = useWaitForTransactionReceipt({
    hash: emergencyUnstakeHash,
  })

  // Claim rewards
  const { 
    writeContract: writeClaimRewards, 
    data: claimHash, 
    isPending: isClaiming,
    error: claimError 
  } = useWriteContract()

  const { isLoading: isClaimConfirming, isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({
    hash: claimHash,
  })

  const stake = useCallback((amount: bigint, referrer?: `0x${string}`) => {
    writeStake({
      address: CONTRACTS.hashStaking,
      abi: HashStakingABI,
      functionName: 'stake',
      args: [amount, referrer || '0x0000000000000000000000000000000000000000'],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeStake])

  const addToStake = useCallback((amount: bigint) => {
    writeAddStake({
      address: CONTRACTS.hashStaking,
      abi: HashStakingABI,
      functionName: 'addToStake',
      args: [amount],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeAddStake])

  const unstake = useCallback(() => {
    writeUnstake({
      address: CONTRACTS.hashStaking,
      abi: HashStakingABI,
      functionName: 'unstake',
      args: [],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeUnstake])

  const emergencyUnstake = useCallback(() => {
    writeEmergencyUnstake({
      address: CONTRACTS.hashStaking,
      abi: HashStakingABI,
      functionName: 'emergencyUnstake',
      args: [],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeEmergencyUnstake])

  const claimRewards = useCallback(() => {
    writeClaimRewards({
      address: CONTRACTS.hashStaking,
      abi: HashStakingABI,
      functionName: 'claimRewards',
      args: [],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeClaimRewards])

  const stakeInfo: StakeInfo | null = stakeInfoData ? {
    amount: BigInt((stakeInfoData as any)[0] || 0),
    lockEnd: BigInt((stakeInfoData as any)[1] || 0),
    isLocked: (stakeInfoData as any)[2],
    daysRemaining: BigInt((stakeInfoData as any)[3] || 0),
  } : null

  const tierInfo: TierInfo | null = tierInfoData ? {
    tier: Number((tierInfoData as any)[0]),
    boostBps: Number((tierInfoData as any)[1]),
    maxBetUsd: BigInt((tierInfoData as any)[2] || 0),
    referralFeeBps: Number((tierInfoData as any)[3]),
  } : null

  const globalStats: GlobalStats | null = globalStatsData ? {
    totalStaked: BigInt((globalStatsData as any)[0] || 0),
    rewardPool: BigInt((globalStatsData as any)[1] || 0),
    accRewardPerShare: BigInt((globalStatsData as any)[2] || 0),
  } : null

  const pendingRewards = pendingRewardsData ? BigInt(pendingRewardsData.toString()) : 0n
  const lockDuration = lockDurationData ? Number(lockDurationData) : 7 * 24 * 60 * 60 // 7 days default

  return {
    // State
    stakeInfo,
    tierInfo,
    tierName: tierInfo ? TIER_NAMES[tierInfo.tier] || 'Unknown' : 'None',
    globalStats,
    pendingRewards,
    formattedPendingRewards: formatEther(pendingRewards),
    referrer: referrerData as `0x${string}` | undefined,
    lockDuration,
    lockDurationDays: Math.floor(lockDuration / (24 * 60 * 60)),
    
    // Actions
    stake,
    addToStake,
    unstake,
    emergencyUnstake,
    claimRewards,
    
    // Stake TX states
    isStaking,
    isStakeConfirming,
    isStakeConfirmed,
    stakeError,
    
    // Add stake TX states
    isAddingStake,
    isAddStakeConfirming,
    isAddStakeConfirmed,
    addStakeError,
    
    // Unstake TX states
    isUnstaking,
    isUnstakeConfirming,
    isUnstakeConfirmed,
    unstakeError,
    
    // Emergency unstake TX states
    isEmergencyUnstaking,
    isEmergencyUnstakeConfirming,
    isEmergencyUnstakeConfirmed,
    
    // Claim TX states
    isClaiming,
    isClaimConfirming,
    isClaimConfirmed,
    claimError,
    
    // Refetch
    refetchStakeInfo,
    refetchTierInfo,
    refetchGlobalStats,
    refetchRewards,
    refetchAll: () => {
      refetchStakeInfo()
      refetchTierInfo()
      refetchGlobalStats()
      refetchRewards()
    }
  }
}
