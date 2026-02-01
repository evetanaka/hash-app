import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useBlockNumber, useWatchContractEvent } from 'wagmi'
import { parseEther } from 'viem'
import { useState, useCallback, useEffect } from 'react'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { HashGameABI } from '../abi'

export const GameMode = {
  ONE_DIGIT: 0,
  TWO_DIGIT: 1,
  THREE_DIGIT: 2,
} as const
export type GameMode = typeof GameMode[keyof typeof GameMode]

export const BetStatus = {
  PENDING: 0,
  WON: 1,
  LOST: 2,
  EXPIRED: 3,
} as const
export type BetStatus = typeof BetStatus[keyof typeof BetStatus]

export interface Bet {
  player: `0x${string}`
  amount: bigint
  mode: GameMode
  prediction: number
  targetBlock: bigint
  status: BetStatus
  isRide: boolean
  payout: bigint
}

export interface GameStats {
  volume: bigint
  burned: bigint
  jackpotPot: bigint
  betsCount: bigint
}

export function useHashGame() {
  const { address } = useAccount()
  const [pendingBetId, setPendingBetId] = useState<bigint | null>(null)
  const [lastResult, setLastResult] = useState<{ won: boolean; result: number; payout: bigint } | null>(null)

  // Read current block
  const { data: blockNumber } = useBlockNumber({ watch: true })

  // Read game stats
  const { data: statsData, refetch: refetchStats } = useReadContract({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    functionName: 'getStats',
    chainId: TARGET_CHAIN.id,
  })

  // Read user streak
  const { data: streakData, refetch: refetchStreak } = useReadContract({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    functionName: 'getStreak',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })

  // Read pending bet
  const { data: pendingBetData, refetch: refetchBet } = useReadContract({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    functionName: 'getBet',
    args: pendingBetId !== null ? [pendingBetId] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: pendingBetId !== null }
  })

  // Read payout multipliers
  const { data: payout1 } = useReadContract({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    functionName: 'PAYOUT_1_DIGIT',
    chainId: TARGET_CHAIN.id,
  })

  const { data: payout2 } = useReadContract({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    functionName: 'PAYOUT_2_DIGIT',
    chainId: TARGET_CHAIN.id,
  })

  const { data: payout3 } = useReadContract({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    functionName: 'PAYOUT_3_DIGIT',
    chainId: TARGET_CHAIN.id,
  })

  // Read MIN_BET
  const { data: minBetData } = useReadContract({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    functionName: 'MIN_BET',
    chainId: TARGET_CHAIN.id,
  })

  // Read JACKPOT_STREAK
  const { data: jackpotStreakData } = useReadContract({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    functionName: 'JACKPOT_STREAK',
    chainId: TARGET_CHAIN.id,
  })

  // Place bet
  const { 
    writeContract: writePlaceBet, 
    data: placeBetHash, 
    isPending: isPlacingBet,
    error: placeBetError 
  } = useWriteContract()

  const { isLoading: isBetConfirming, isSuccess: isBetConfirmed } = useWaitForTransactionReceipt({
    hash: placeBetHash,
  })

  // Resolve bet
  const { 
    writeContract: writeResolveBet, 
    data: resolveHash, 
    isPending: isResolving,
    error: resolveError 
  } = useWriteContract()

  const { isLoading: isResolveConfirming, isSuccess: isResolveConfirmed } = useWaitForTransactionReceipt({
    hash: resolveHash,
  })

  // Cash out
  const { 
    writeContract: writeCashOut, 
    data: cashOutHash, 
    isPending: isCashingOut 
  } = useWriteContract()

  const { isLoading: isCashOutConfirming, isSuccess: isCashOutConfirmed } = useWaitForTransactionReceipt({
    hash: cashOutHash,
  })

  // Watch for BetPlaced events
  useWatchContractEvent({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    eventName: 'BetPlaced',
    onLogs(logs) {
      const log = logs[0]
      if (log && address && (log as any).args?.player?.toLowerCase() === address.toLowerCase()) {
        setPendingBetId((log as any).args.betId)
      }
    },
  })

  // Watch for BetResolved events
  useWatchContractEvent({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    eventName: 'BetResolved',
    onLogs(logs) {
      const log = logs[0]
      if (log && address && (log as any).args?.player?.toLowerCase() === address.toLowerCase()) {
        const args = (log as any).args
        setLastResult({
          won: args.won,
          result: Number(args.result),
          payout: args.payout,
        })
        setPendingBetId(null)
        refetchStats()
        refetchStreak()
      }
    },
  })

  const placeBet = useCallback((mode: GameMode, prediction: number, amount: bigint) => {
    setLastResult(null)
    writePlaceBet({
      address: CONTRACTS.hashGame,
      abi: HashGameABI,
      functionName: 'placeBet',
      args: [mode, prediction, amount],
      chainId: TARGET_CHAIN.id,
    })
  }, [writePlaceBet])

  const resolveBet = useCallback((betId: bigint) => {
    writeResolveBet({
      address: CONTRACTS.hashGame,
      abi: HashGameABI,
      functionName: 'resolveBet',
      args: [betId],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeResolveBet])

  const cashOut = useCallback((betId: bigint) => {
    writeCashOut({
      address: CONTRACTS.hashGame,
      abi: HashGameABI,
      functionName: 'cashOut',
      args: [betId],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeCashOut])

  // Auto-resolve when target block is reached
  useEffect(() => {
    if (pendingBetId !== null && pendingBetData && blockNumber) {
      const bet = pendingBetData as any
      const targetBlock = BigInt(bet[4] || bet.targetBlock || 0)
      if (blockNumber >= targetBlock && bet[5] === 0) { // status === PENDING
        resolveBet(pendingBetId)
      }
    }
  }, [blockNumber, pendingBetId, pendingBetData, resolveBet])

  const stats: GameStats | null = statsData ? {
    volume: BigInt((statsData as any)[0] || 0),
    burned: BigInt((statsData as any)[1] || 0),
    jackpotPot: BigInt((statsData as any)[2] || 0),
    betsCount: BigInt((statsData as any)[3] || 0),
  } : null

  const currentStreak = streakData ? Number((streakData as any)[0]) : 0
  const streakMode = streakData ? Number((streakData as any)[1]) : 0

  const pendingBet: Bet | null = pendingBetData ? {
    player: (pendingBetData as any)[0],
    amount: BigInt((pendingBetData as any)[1] || 0),
    mode: Number((pendingBetData as any)[2]) as GameMode,
    prediction: Number((pendingBetData as any)[3]),
    targetBlock: BigInt((pendingBetData as any)[4] || 0),
    status: Number((pendingBetData as any)[5]) as BetStatus,
    isRide: (pendingBetData as any)[6],
    payout: BigInt((pendingBetData as any)[7] || 0),
  } : null

  const payouts = {
    [GameMode.ONE_DIGIT]: payout1 ? Number(payout1) : 10,
    [GameMode.TWO_DIGIT]: payout2 ? Number(payout2) : 150,
    [GameMode.THREE_DIGIT]: payout3 ? Number(payout3) : 2000,
  }

  return {
    // State
    stats,
    currentStreak,
    streakMode,
    pendingBetId,
    pendingBet,
    lastResult,
    blockNumber: blockNumber ?? 0n,
    minBet: minBetData ? BigInt(minBetData.toString()) : parseEther('1'),
    jackpotStreak: jackpotStreakData ? Number(jackpotStreakData) : 5,
    payouts,
    
    // Actions
    placeBet,
    resolveBet,
    cashOut,
    
    // TX states
    isPlacingBet,
    isBetConfirming,
    isBetConfirmed,
    placeBetError,
    isResolving,
    isResolveConfirming,
    isResolveConfirmed,
    resolveError,
    isCashingOut,
    isCashOutConfirming,
    isCashOutConfirmed,
    
    // Refetch
    refetchStats,
    refetchStreak,
    refetchBet,
    
    // Clear
    clearResult: () => setLastResult(null),
  }
}
