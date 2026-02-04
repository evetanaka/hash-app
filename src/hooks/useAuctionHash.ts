import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useWatchContractEvent } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { AuctionHashABI } from '../abi'
import HashTokenABI from '../abi/HashToken.json'

// Types
export interface AuctionData {
  auctionId: bigint
  startTime: bigint
  endTime: bigint
  jackpot: bigint
  totalBids: bigint
  revealed: boolean
  winner: `0x${string}` | null
  winningBid: bigint
}

export interface BidEntry {
  bidder: `0x${string}`
  amount: bigint
  rank: number
  isInDangerZone: boolean
  gapPercent: number
}

export interface SafeZone {
  isValid: boolean
  minSafeAmount: bigint
  maxSafeAmount: bigint
}

export interface AuctionHistoryEntry {
  auctionId: bigint
  winner: `0x${string}` | null
  winningBid: bigint
  jackpot: bigint
}

export interface PendingClaim {
  hasClaim: boolean
  isWinner: boolean
  claimAmount: bigint
}

// Contract address
const AUCTION_HASH_ADDRESS = CONTRACTS.auctionHash

export function useAuctionHash() {
  const { address } = useAccount()
  const [bidAmount, setBidAmount] = useState<string>('')

  // ============ Read Current Auction ============

  const { data: currentAuctionData, refetch: refetchAuction } = useReadContract({
    address: AUCTION_HASH_ADDRESS,
    abi: AuctionHashABI,
    functionName: 'getCurrentAuction',
    chainId: TARGET_CHAIN.id,
    query: {
      enabled: AUCTION_HASH_ADDRESS !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 10000, // Refresh every 10s
    }
  })

  // ============ Read Bids ============

  const currentAuctionId = currentAuctionData ? BigInt((currentAuctionData as any)[0]) : 0n

  const { data: sortedBidsData, refetch: refetchBids } = useReadContract({
    address: AUCTION_HASH_ADDRESS,
    abi: AuctionHashABI,
    functionName: 'getSortedBids',
    args: [currentAuctionId],
    chainId: TARGET_CHAIN.id,
    query: {
      enabled: currentAuctionId > 0n,
      refetchInterval: 10000,
    }
  })

  // ============ Read Parameters ============

  const { data: maxGapPercent } = useReadContract({
    address: AUCTION_HASH_ADDRESS,
    abi: AuctionHashABI,
    functionName: 'maxGapPercent',
    chainId: TARGET_CHAIN.id,
  })

  const { data: minBidData } = useReadContract({
    address: AUCTION_HASH_ADDRESS,
    abi: AuctionHashABI,
    functionName: 'minBid',
    chainId: TARGET_CHAIN.id,
  })

  const { data: losersRefundPercent } = useReadContract({
    address: AUCTION_HASH_ADDRESS,
    abi: AuctionHashABI,
    functionName: 'losersRefundPercent',
    chainId: TARGET_CHAIN.id,
  })

  // ============ Read User's Bid ============

  const { data: userBidData, refetch: refetchUserBid } = useReadContract({
    address: AUCTION_HASH_ADDRESS,
    abi: AuctionHashABI,
    functionName: 'bids',
    args: address ? [currentAuctionId, address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: {
      enabled: !!address && currentAuctionId > 0n,
    }
  })

  // ============ Read Safe Zone ============

  const bidAmountBigInt = useMemo(() => {
    try {
      return bidAmount ? parseEther(bidAmount) : 0n
    } catch {
      return 0n
    }
  }, [bidAmount])

  const { data: safeZoneData } = useReadContract({
    address: AUCTION_HASH_ADDRESS,
    abi: AuctionHashABI,
    functionName: 'calculateSafeZone',
    args: [bidAmountBigInt > 0n ? bidAmountBigInt : parseEther('1')],
    chainId: TARGET_CHAIN.id,
    query: {
      enabled: currentAuctionId > 0n,
    }
  })

  // ============ Read Pending Claim ============

  const { data: pendingClaimData, refetch: refetchClaim } = useReadContract({
    address: AUCTION_HASH_ADDRESS,
    abi: AuctionHashABI,
    functionName: 'hasPendingClaim',
    args: address ? [currentAuctionId > 1n ? currentAuctionId - 1n : 1n, address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: {
      enabled: !!address && currentAuctionId > 1n,
    }
  })

  // ============ Read Token Balance & Allowance ============

  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.hashToken,
    abi: HashTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.hashToken,
    abi: HashTokenABI,
    functionName: 'allowance',
    args: address ? [address, AUCTION_HASH_ADDRESS] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  // ============ Read History ============

  const { data: historyData } = useReadContract({
    address: AUCTION_HASH_ADDRESS,
    abi: AuctionHashABI,
    functionName: 'getAuctionHistory',
    args: [0n, 10n],
    chainId: TARGET_CHAIN.id,
    query: {
      enabled: currentAuctionId > 1n,
    }
  })

  // ============ Write Functions ============

  // Approve tokens
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApproving,
    error: approveError
  } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // Place bid
  const {
    writeContract: writeBid,
    data: bidHash,
    isPending: isBidding,
    error: bidError
  } = useWriteContract()

  const { isLoading: isBidConfirming, isSuccess: isBidConfirmed } = useWaitForTransactionReceipt({
    hash: bidHash,
  })

  // Claim winnings
  const {
    writeContract: writeClaimWinnings,
    data: claimWinningsHash,
    isPending: isClaimingWinnings,
    error: claimWinningsError
  } = useWriteContract()

  const { isLoading: isClaimWinningsConfirming, isSuccess: isClaimWinningsConfirmed } = useWaitForTransactionReceipt({
    hash: claimWinningsHash,
  })

  // Claim refund
  const {
    writeContract: writeClaimRefund,
    data: claimRefundHash,
    isPending: isClaimingRefund,
    error: claimRefundError
  } = useWriteContract()

  const { isLoading: isClaimRefundConfirming, isSuccess: isClaimRefundConfirmed } = useWaitForTransactionReceipt({
    hash: claimRefundHash,
  })

  // Reveal (manual trigger)
  const {
    writeContract: writeReveal,
    data: revealHash,
    isPending: isRevealing,
    error: revealError
  } = useWriteContract()

  const { isLoading: isRevealConfirming, isSuccess: isRevealConfirmed } = useWaitForTransactionReceipt({
    hash: revealHash,
  })

  // ============ Watch Events ============

  useWatchContractEvent({
    address: AUCTION_HASH_ADDRESS,
    abi: AuctionHashABI,
    eventName: 'BidPlaced',
    onLogs() {
      refetchBids()
      refetchAuction()
      refetchUserBid()
    },
  })

  useWatchContractEvent({
    address: AUCTION_HASH_ADDRESS,
    abi: AuctionHashABI,
    eventName: 'WinnerDetermined',
    onLogs() {
      refetchAuction()
      refetchClaim()
    },
  })

  // ============ Actions ============

  const approve = useCallback((amount: bigint) => {
    writeApprove({
      address: CONTRACTS.hashToken,
      abi: HashTokenABI,
      functionName: 'approve',
      args: [AUCTION_HASH_ADDRESS, amount],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeApprove])

  const placeBid = useCallback((amount: bigint) => {
    writeBid({
      address: AUCTION_HASH_ADDRESS,
      abi: AuctionHashABI,
      functionName: 'bid',
      args: [amount],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeBid])

  const claimWinnings = useCallback((auctionId: bigint) => {
    writeClaimWinnings({
      address: AUCTION_HASH_ADDRESS,
      abi: AuctionHashABI,
      functionName: 'claimWinnings',
      args: [auctionId],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeClaimWinnings])

  const claimRefund = useCallback((auctionId: bigint) => {
    writeClaimRefund({
      address: AUCTION_HASH_ADDRESS,
      abi: AuctionHashABI,
      functionName: 'claimRefund',
      args: [auctionId],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeClaimRefund])

  const reveal = useCallback(() => {
    writeReveal({
      address: AUCTION_HASH_ADDRESS,
      abi: AuctionHashABI,
      functionName: 'reveal',
      args: [],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeReveal])

  // ============ Refresh on confirmations ============

  useEffect(() => {
    if (isApproveConfirmed) {
      refetchAllowance()
    }
  }, [isApproveConfirmed, refetchAllowance])

  useEffect(() => {
    if (isBidConfirmed) {
      refetchBids()
      refetchAuction()
      refetchUserBid()
      refetchBalance()
      setBidAmount('')
    }
  }, [isBidConfirmed, refetchBids, refetchAuction, refetchUserBid, refetchBalance])

  useEffect(() => {
    if (isClaimWinningsConfirmed || isClaimRefundConfirmed) {
      refetchClaim()
      refetchBalance()
    }
  }, [isClaimWinningsConfirmed, isClaimRefundConfirmed, refetchClaim, refetchBalance])

  // ============ Computed Values ============

  const auction: AuctionData | null = currentAuctionData ? {
    auctionId: BigInt((currentAuctionData as any)[0]),
    startTime: BigInt((currentAuctionData as any)[1]),
    endTime: BigInt((currentAuctionData as any)[2]),
    jackpot: BigInt((currentAuctionData as any)[3]),
    totalBids: BigInt((currentAuctionData as any)[4]),
    revealed: (currentAuctionData as any)[5],
    winner: (currentAuctionData as any)[6] === '0x0000000000000000000000000000000000000000' 
      ? null 
      : (currentAuctionData as any)[6],
    winningBid: BigInt((currentAuctionData as any)[7]),
  } : null

  const maxGap = maxGapPercent ? Number(maxGapPercent) : 30
  
  const bids: BidEntry[] = useMemo(() => {
    if (!sortedBidsData) return []
    
    const bidders = (sortedBidsData as any)[0] as `0x${string}`[]
    const amounts = (sortedBidsData as any)[1] as bigint[]
    
    return bidders.map((bidder, index) => {
      const amount = BigInt(amounts[index])
      const nextAmount = index < amounts.length - 1 ? BigInt(amounts[index + 1]) : 0n
      
      // Calculate gap with next bid
      const gapPercent = nextAmount > 0n 
        ? Number(((amount - nextAmount) * 100n) / amount)
        : 0
      
      // In danger zone if gap > maxGapPercent
      const isInDangerZone = gapPercent > maxGap
      
      return {
        bidder,
        amount,
        rank: index + 1,
        isInDangerZone,
        gapPercent,
      }
    })
  }, [sortedBidsData, maxGap])

  const safeZone: SafeZone = safeZoneData ? {
    isValid: (safeZoneData as any)[0],
    minSafeAmount: BigInt((safeZoneData as any)[1]),
    maxSafeAmount: BigInt((safeZoneData as any)[2]),
  } : {
    isValid: true,
    minSafeAmount: minBidData ? BigInt(minBidData.toString()) : parseEther('1'),
    maxSafeAmount: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
  }

  const pendingClaim: PendingClaim = pendingClaimData ? {
    hasClaim: (pendingClaimData as any)[0],
    isWinner: (pendingClaimData as any)[1],
    claimAmount: BigInt((pendingClaimData as any)[2]),
  } : {
    hasClaim: false,
    isWinner: false,
    claimAmount: 0n,
  }

  const userBid = userBidData ? BigInt(userBidData.toString()) : 0n

  const history: AuctionHistoryEntry[] = useMemo(() => {
    if (!historyData) return []
    
    const ids = (historyData as any)[0] as bigint[]
    const winners = (historyData as any)[1] as `0x${string}`[]
    const winningBids = (historyData as any)[2] as bigint[]
    const jackpots = (historyData as any)[3] as bigint[]
    
    return ids.map((id, index) => ({
      auctionId: BigInt(id),
      winner: winners[index] === '0x0000000000000000000000000000000000000000' 
        ? null 
        : winners[index],
      winningBid: BigInt(winningBids[index]),
      jackpot: BigInt(jackpots[index]),
    })).filter(entry => entry.winner !== null) // Only show completed auctions
      .reverse() // Most recent first
  }, [historyData])

  // Time calculations
  const now = BigInt(Math.floor(Date.now() / 1000))
  const timeRemaining = auction && auction.endTime > now 
    ? Number(auction.endTime - now)
    : 0
  const isAuctionActive = auction && now >= auction.startTime && now < auction.endTime && !auction.revealed
  const canReveal = auction && now >= auction.endTime && !auction.revealed

  // Allowance check
  const needsApproval = tokenAllowance !== undefined && tokenAllowance !== null && bidAmountBigInt > 0n
    ? BigInt(tokenAllowance.toString()) < bidAmountBigInt
    : true

  return {
    // State
    auction,
    bids,
    userBid,
    safeZone,
    pendingClaim,
    history,
    
    // Parameters
    maxGapPercent: maxGap,
    minBid: minBidData ? BigInt(minBidData.toString()) : parseEther('1'),
    losersRefundPercent: losersRefundPercent ? Number(losersRefundPercent) : 90,
    
    // Token state
    balance: tokenBalance ? BigInt(tokenBalance.toString()) : 0n,
    allowance: tokenAllowance ? BigInt(tokenAllowance.toString()) : 0n,
    needsApproval,
    
    // Time state
    timeRemaining,
    isAuctionActive,
    canReveal,
    
    // Bid input
    bidAmount,
    setBidAmount,
    bidAmountBigInt,
    
    // Actions
    approve,
    placeBid,
    claimWinnings,
    claimRefund,
    reveal,
    
    // TX states
    isApproving,
    isApproveConfirming,
    isApproveConfirmed,
    approveError,
    isBidding,
    isBidConfirming,
    isBidConfirmed,
    bidError,
    isClaimingWinnings,
    isClaimWinningsConfirming,
    isClaimWinningsConfirmed,
    claimWinningsError,
    isClaimingRefund,
    isClaimRefundConfirming,
    isClaimRefundConfirmed,
    claimRefundError,
    isRevealing,
    isRevealConfirming,
    isRevealConfirmed,
    revealError,
    
    // Refresh
    refetchAuction,
    refetchBids,
    refetchBalance,
    refetchAllowance,
    
    // Contract address (for debugging)
    contractAddress: AUCTION_HASH_ADDRESS,
  }
}

// Helper to format countdown
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Helper to format amounts
export function formatAmount(amount: bigint, decimals: number = 2): string {
  const formatted = formatEther(amount)
  const num = parseFloat(formatted)
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(decimals) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(decimals) + 'K'
  }
  return num.toFixed(decimals)
}
