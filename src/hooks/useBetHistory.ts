import { useAccount, usePublicClient } from 'wagmi'
import { useState, useEffect, useCallback } from 'react'
import { parseAbiItem } from 'viem'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { GameMode } from './useHashGame'

export interface BetEvent {
  betId: bigint
  player: `0x${string}`
  mode: GameMode
  prediction: number
  amount: bigint
  targetBlock: bigint
  won?: boolean
  result?: number
  payout?: bigint
  txHash: `0x${string}`
  blockNumber: bigint
  timestamp?: number
}

const BET_PLACED_EVENT = parseAbiItem('event BetPlaced(uint256 indexed betId, address indexed player, uint8 mode, uint16 prediction, uint256 amount, uint256 targetBlock)')
const BET_RESOLVED_EVENT = parseAbiItem('event BetResolved(uint256 indexed betId, address indexed player, bool won, uint16 result, uint256 payout)')

export function useBetHistory(limit = 50) {
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN.id })
  
  const [bets, setBets] = useState<BetEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!address || !publicClient) return

    setIsLoading(true)
    setError(null)

    try {
      // Contract was deployed around block 10165750 on Sepolia
      const DEPLOYMENT_BLOCK = 10165750n
      const currentBlock = await publicClient.getBlockNumber()
      
      // Fetch in chunks of 900 blocks (under 1000 limit)
      const CHUNK_SIZE = 900n
      const allPlacedLogs: any[] = []
      const allResolvedLogs: any[] = []
      
      let fromBlock = DEPLOYMENT_BLOCK
      while (fromBlock < currentBlock) {
        const toBlock = fromBlock + CHUNK_SIZE > currentBlock ? currentBlock : fromBlock + CHUNK_SIZE
        
        const [placedChunk, resolvedChunk] = await Promise.all([
          publicClient.getLogs({
            address: CONTRACTS.hashGame,
            event: BET_PLACED_EVENT,
            args: { player: address },
            fromBlock,
            toBlock,
          }),
          publicClient.getLogs({
            address: CONTRACTS.hashGame,
            event: BET_RESOLVED_EVENT,
            args: { player: address },
            fromBlock,
            toBlock,
          })
        ])
        
        allPlacedLogs.push(...placedChunk)
        allResolvedLogs.push(...resolvedChunk)
        fromBlock = toBlock + 1n
      }

      const placedLogs = allPlacedLogs
      const resolvedLogs = allResolvedLogs

      // Create map of resolved bets
      const resolvedMap = new Map<string, { won: boolean; result: number; payout: bigint }>()
      for (const log of resolvedLogs) {
        const args = log.args as any
        resolvedMap.set(args.betId.toString(), {
          won: args.won,
          result: Number(args.result),
          payout: args.payout,
        })
      }

      // Combine placed and resolved data
      const betEvents: BetEvent[] = placedLogs.map((log) => {
        const args = log.args as any
        const resolved = resolvedMap.get(args.betId.toString())
        
        return {
          betId: args.betId,
          player: args.player,
          mode: Number(args.mode) as GameMode,
          prediction: Number(args.prediction),
          amount: args.amount,
          targetBlock: args.targetBlock,
          won: resolved?.won,
          result: resolved?.result,
          payout: resolved?.payout,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        }
      })

      // Sort by block number (newest first) and limit
      betEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber))
      setBets(betEvents.slice(0, limit))
    } catch (err) {
      console.error('Error fetching bet history:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [address, publicClient, limit])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const wins = bets.filter(b => b.won === true)
  const losses = bets.filter(b => b.won === false)
  const pending = bets.filter(b => b.won === undefined)

  const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0n)
  const totalWon = wins.reduce((sum, b) => sum + (b.payout || 0n), 0n)
  const netProfit = totalWon - totalWagered

  return {
    bets,
    wins,
    losses,
    pending,
    stats: {
      totalBets: bets.length,
      winCount: wins.length,
      lossCount: losses.length,
      pendingCount: pending.length,
      winRate: bets.length > 0 ? (wins.length / (wins.length + losses.length)) * 100 : 0,
      totalWagered,
      totalWon,
      netProfit,
    },
    isLoading,
    error,
    refetch: fetchHistory,
  }
}
