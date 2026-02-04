import { useState, useMemo, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther, keccak256, encodePacked } from 'viem'
import { CONTRACTS } from '../config/wagmi'

// ABI for AuctionHashSealed contract
const AUCTION_HASH_ABI = [
  // Read functions
  {
    name: 'getCurrentAuction',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'auctionId', type: 'uint256' },
      { name: 'revealTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'jackpot', type: 'uint256' },
      { name: 'totalBids', type: 'uint256' },
      { name: 'finalized', type: 'bool' }
    ]
  },
  {
    name: 'getBucketCounts',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[6]' }]
  },
  {
    name: 'bids',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'auctionId', type: 'uint256' },
      { name: 'bidder', type: 'address' }
    ],
    outputs: [
      { name: 'commitment', type: 'bytes32' },
      { name: 'bucket', type: 'uint8' },
      { name: 'deposit', type: 'uint256' },
      { name: 'revealed', type: 'bool' },
      { name: 'revealedAmount', type: 'uint256' }
    ]
  },
  {
    name: 'hasBid',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'maxGapPercent',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'losersRefundPercent',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'minBid',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'generateCommitment',
    type: 'function',
    stateMutability: 'pure',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'secret', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    name: 'getBucket',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    name: 'auctions',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: [
      { name: 'auctionId', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'revealTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'jackpot', type: 'uint256' },
      { name: 'totalBids', type: 'uint256' },
      { name: 'finalized', type: 'bool' },
      { name: 'winner', type: 'address' },
      { name: 'winningBid', type: 'uint256' }
    ]
  },
  // Write functions
  {
    name: 'placeBid',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'commitment', type: 'bytes32' },
      { name: 'bucket', type: 'uint8' },
      { name: 'deposit', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'revealBid',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'secret', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'finalizeAuction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    name: 'claimWinnings',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'claimRefund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: []
  },
  // Events
  {
    name: 'BidPlaced',
    type: 'event',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: true },
      { name: 'bucket', type: 'uint8', indexed: false }
    ]
  },
  {
    name: 'BidRevealed',
    type: 'event',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  },
  {
    name: 'AuctionFinalized',
    type: 'event',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: false },
      { name: 'winningBid', type: 'uint256', indexed: false },
      { name: 'jackpot', type: 'uint256', indexed: false }
    ]
  }
] as const

// Bucket definitions matching the contract
export const BUCKETS = [
  { id: 0, label: '0-500', min: 0, max: 500 },
  { id: 1, label: '500-1k', min: 500, max: 1000 },
  { id: 2, label: '1k-2k', min: 1000, max: 2000 },
  { id: 3, label: '2k-5k', min: 2000, max: 5000 },
  { id: 4, label: '5k-10k', min: 5000, max: 10000 },
  { id: 5, label: '10k+', min: 10000, max: Infinity },
]

export function getBucketForAmount(amount: number): number {
  for (let i = 0; i < BUCKETS.length; i++) {
    if (amount >= BUCKETS[i].min && amount < BUCKETS[i].max) {
      return i
    }
  }
  return BUCKETS.length - 1
}

// Generate a random secret for bid commitment
export function generateSecret(): `0x${string}` {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return `0x${Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`
}

// Generate commitment hash locally (for verification)
export function generateCommitment(amount: bigint, secret: `0x${string}`): `0x${string}` {
  return keccak256(encodePacked(['uint256', 'bytes32'], [amount, secret]))
}

export function useAuctionHashSealed() {
  const { address } = useAccount()
  const [bidAmount, setBidAmount] = useState('')
  const [userSecret, setUserSecret] = useState<`0x${string}` | null>(null)

  const contractAddress = CONTRACTS.auctionHash

  // Read current auction data
  const { data: auctionData, refetch: refetchAuction } = useReadContract({
    address: contractAddress,
    abi: AUCTION_HASH_ABI,
    functionName: 'getCurrentAuction',
    query: {
      enabled: contractAddress !== '0x0000000000000000000000000000000000000000'
    }
  })

  // Read bucket counts for heatmap
  const { data: bucketCountsRaw, refetch: refetchBuckets } = useReadContract({
    address: contractAddress,
    abi: AUCTION_HASH_ABI,
    functionName: 'getBucketCounts',
    query: {
      enabled: contractAddress !== '0x0000000000000000000000000000000000000000'
    }
  })

  // Read user's bid
  const { data: userBidData, refetch: refetchUserBid } = useReadContract({
    address: contractAddress,
    abi: AUCTION_HASH_ABI,
    functionName: 'hasBid',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && contractAddress !== '0x0000000000000000000000000000000000000000'
    }
  })

  // Read parameters
  const { data: maxGapPercent } = useReadContract({
    address: contractAddress,
    abi: AUCTION_HASH_ABI,
    functionName: 'maxGapPercent',
    query: {
      enabled: contractAddress !== '0x0000000000000000000000000000000000000000'
    }
  })

  const { data: losersRefundPercent } = useReadContract({
    address: contractAddress,
    abi: AUCTION_HASH_ABI,
    functionName: 'losersRefundPercent',
    query: {
      enabled: contractAddress !== '0x0000000000000000000000000000000000000000'
    }
  })

  const { data: minBidRaw } = useReadContract({
    address: contractAddress,
    abi: AUCTION_HASH_ABI,
    functionName: 'minBid',
    query: {
      enabled: contractAddress !== '0x0000000000000000000000000000000000000000'
    }
  })

  // Write functions
  const { writeContract: writePlaceBid, data: placeBidHash, isPending: isPlacingBid } = useWriteContract()
  const { writeContract: writeRevealBid, data: revealBidHash, isPending: isRevealingBid } = useWriteContract()
  const { writeContract: writeClaimWinnings, data: claimWinningsHash, isPending: isClaimingWinnings } = useWriteContract()
  const { writeContract: writeClaimRefund, data: claimRefundHash, isPending: isClaimingRefund } = useWriteContract()

  // Wait for transactions
  const { isLoading: isPlaceBidConfirming } = useWaitForTransactionReceipt({ hash: placeBidHash })
  const { isLoading: isRevealConfirming } = useWaitForTransactionReceipt({ hash: revealBidHash })
  const { isLoading: isClaimWinningsConfirming } = useWaitForTransactionReceipt({ hash: claimWinningsHash })
  const { isLoading: isClaimRefundConfirming } = useWaitForTransactionReceipt({ hash: claimRefundHash })

  // Parse auction data
  const auction = useMemo(() => {
    if (!auctionData) return null
    const [auctionId, revealTime, endTime, jackpot, totalBids, finalized] = auctionData
    return {
      auctionId,
      revealTime,
      endTime,
      jackpot,
      totalBids,
      finalized
    }
  }, [auctionData])

  // Parse bucket counts
  const bucketCounts = useMemo(() => {
    if (!bucketCountsRaw) return [0, 0, 0, 0, 0, 0]
    return Array.from(bucketCountsRaw).map(n => Number(n))
  }, [bucketCountsRaw])

  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    if (!auction?.revealTime) return 0
    const now = BigInt(Math.floor(Date.now() / 1000))
    const remaining = auction.revealTime - now
    return remaining > 0n ? Number(remaining) : 0
  }, [auction?.revealTime])

  // Check auction phase
  const isInBiddingPhase = useMemo(() => {
    if (!auction) return false
    const now = BigInt(Math.floor(Date.now() / 1000))
    return now < auction.revealTime
  }, [auction])

  const isInRevealPhase = useMemo(() => {
    if (!auction) return false
    const now = BigInt(Math.floor(Date.now() / 1000))
    return now >= auction.revealTime && now < auction.endTime && !auction.finalized
  }, [auction])

  const canFinalize = useMemo(() => {
    if (!auction) return false
    const now = BigInt(Math.floor(Date.now() / 1000))
    return now >= auction.endTime && !auction.finalized
  }, [auction])

  // Bid amount as bigint
  const bidAmountBigInt = useMemo(() => {
    if (!bidAmount || isNaN(Number(bidAmount))) return 0n
    try {
      return parseEther(bidAmount)
    } catch {
      return 0n
    }
  }, [bidAmount])

  // Get bucket for current bid amount
  const currentBucket = useMemo(() => {
    const amount = Number(bidAmount) || 0
    return getBucketForAmount(amount)
  }, [bidAmount])

  // Place sealed bid
  const placeBid = useCallback(async (amount: bigint, deposit: bigint) => {
    if (!address || !isInBiddingPhase) return

    // Generate secret and store it
    const secret = generateSecret()
    setUserSecret(secret)
    
    // Store secret in localStorage for later reveal
    const storageKey = `auction_secret_${contractAddress}_${auction?.auctionId}`
    localStorage.setItem(storageKey, JSON.stringify({ secret, amount: amount.toString() }))

    // Generate commitment
    const commitment = generateCommitment(amount, secret)
    const bucket = getBucketForAmount(Number(formatEther(amount)))

    writePlaceBid({
      address: contractAddress,
      abi: AUCTION_HASH_ABI,
      functionName: 'placeBid',
      args: [commitment, bucket, deposit]
    })
  }, [address, isInBiddingPhase, contractAddress, auction?.auctionId, writePlaceBid])

  // Reveal bid (during reveal phase)
  const revealBid = useCallback(async () => {
    if (!address || !isInRevealPhase) return

    // Retrieve secret from localStorage
    const storageKey = `auction_secret_${contractAddress}_${auction?.auctionId}`
    const stored = localStorage.getItem(storageKey)
    if (!stored) {
      console.error('No stored secret found')
      return
    }

    const { secret, amount } = JSON.parse(stored)
    
    writeRevealBid({
      address: contractAddress,
      abi: AUCTION_HASH_ABI,
      functionName: 'revealBid',
      args: [BigInt(amount), secret]
    })
  }, [address, isInRevealPhase, contractAddress, auction?.auctionId, writeRevealBid])

  // Claim winnings
  const claimWinnings = useCallback((auctionId: bigint) => {
    writeClaimWinnings({
      address: contractAddress,
      abi: AUCTION_HASH_ABI,
      functionName: 'claimWinnings',
      args: [auctionId]
    })
  }, [contractAddress, writeClaimWinnings])

  // Claim refund
  const claimRefund = useCallback((auctionId: bigint) => {
    writeClaimRefund({
      address: contractAddress,
      abi: AUCTION_HASH_ABI,
      functionName: 'claimRefund',
      args: [auctionId]
    })
  }, [contractAddress, writeClaimRefund])

  // Refetch all data
  const refetchAll = useCallback(() => {
    refetchAuction()
    refetchBuckets()
    refetchUserBid()
  }, [refetchAuction, refetchBuckets, refetchUserBid])

  return {
    // Auction data
    auction,
    bucketCounts,
    timeRemaining,
    
    // Phases
    isInBiddingPhase,
    isInRevealPhase,
    canFinalize,
    
    // User state
    hasBid: userBidData ?? false,
    userSecret,
    
    // Parameters
    maxGapPercent: maxGapPercent ? Number(maxGapPercent) : 30,
    losersRefundPercent: losersRefundPercent ? Number(losersRefundPercent) : 90,
    minBid: minBidRaw ?? parseEther('100'),
    
    // Bid input
    bidAmount,
    setBidAmount,
    bidAmountBigInt,
    currentBucket,
    
    // Actions
    placeBid,
    revealBid,
    claimWinnings,
    claimRefund,
    refetchAll,
    
    // Loading states
    isPlacingBid,
    isPlaceBidConfirming,
    isRevealingBid,
    isRevealConfirming,
    isClaimingWinnings,
    isClaimWinningsConfirming,
    isClaimingRefund,
    isClaimRefundConfirming,
    
    // Contract info
    contractAddress,
    isContractDeployed: contractAddress !== '0x0000000000000000000000000000000000000000'
  }
}

// Helper to format amount for display
export function formatAmount(amount: bigint, decimals = 2): string {
  const formatted = formatEther(amount)
  const num = parseFloat(formatted)
  if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`
  return num.toFixed(decimals)
}

// Helper to format countdown
export function formatCountdown(seconds: number): { d: number; h: number; m: number; s: number } {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return { d, h, m, s }
}
