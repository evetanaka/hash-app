import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther, formatEther, maxUint256 } from 'viem'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { HashTokenABI } from '../abi'

export function useHashToken() {
  const { address } = useAccount()
  
  // Read $HASH balance
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.hashToken,
    abi: HashTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  // Read allowance for HashGame
  const { data: gameAllowance, refetch: refetchGameAllowance } = useReadContract({
    address: CONTRACTS.hashToken,
    abi: HashTokenABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.hashGame] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  // Read allowance for HashStaking
  const { data: stakingAllowance, refetch: refetchStakingAllowance } = useReadContract({
    address: CONTRACTS.hashToken,
    abi: HashTokenABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.hashStaking] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  // Read allowance for CyberSlots
  const { data: slotsAllowance, refetch: refetchSlotsAllowance } = useReadContract({
    address: CONTRACTS.hashToken,
    abi: HashTokenABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.cyberSlots] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  // Approve function
  const { writeContract, data: approveHash, isPending: isApproving, error: approveError } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  const approveGame = async (amount?: bigint) => {
    writeContract({
      address: CONTRACTS.hashToken,
      abi: HashTokenABI,
      functionName: 'approve',
      args: [CONTRACTS.hashGame, amount ?? maxUint256],
      chainId: TARGET_CHAIN.id,
    })
  }

  const approveStaking = async (amount?: bigint) => {
    writeContract({
      address: CONTRACTS.hashToken,
      abi: HashTokenABI,
      functionName: 'approve',
      args: [CONTRACTS.hashStaking, amount ?? maxUint256],
      chainId: TARGET_CHAIN.id,
    })
  }

  const approveSlots = async (amount?: bigint) => {
    writeContract({
      address: CONTRACTS.hashToken,
      abi: HashTokenABI,
      functionName: 'approve',
      args: [CONTRACTS.cyberSlots, amount ?? maxUint256],
      chainId: TARGET_CHAIN.id,
    })
  }

  const balance = balanceData ? BigInt(balanceData.toString()) : 0n
  const formattedBalance = formatEther(balance)
  const hasGameApproval = gameAllowance ? BigInt(gameAllowance.toString()) > 0n : false
  const hasStakingApproval = stakingAllowance ? BigInt(stakingAllowance.toString()) > 0n : false
  const hasSlotsApproval = slotsAllowance ? BigInt(slotsAllowance.toString()) > 0n : false

  return {
    balance,
    formattedBalance,
    gameAllowance: gameAllowance ? BigInt(gameAllowance.toString()) : 0n,
    stakingAllowance: stakingAllowance ? BigInt(stakingAllowance.toString()) : 0n,
    slotsAllowance: slotsAllowance ? BigInt(slotsAllowance.toString()) : 0n,
    hasGameApproval,
    hasStakingApproval,
    hasSlotsApproval,
    approveGame,
    approveStaking,
    approveSlots,
    isApproving,
    isApproveConfirming,
    isApproveConfirmed,
    approveError,
    refetchBalance,
    refetchGameAllowance,
    refetchStakingAllowance,
    refetchSlotsAllowance,
    parseAmount: parseEther,
    formatAmount: formatEther,
  }
}
