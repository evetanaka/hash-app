import { useReadContract, usePublicClient, useBlockNumber } from 'wagmi'
import { useState, useEffect, useCallback } from 'react'
import { parseAbiItem, formatEther } from 'viem'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { HashGameABI } from '../abi'

const BET_RESOLVED_EVENT = parseAbiItem('event BetResolved(uint256 indexed betId, address indexed player, bool won, uint16 result, uint256 payout)')

export interface LastWin {
  player: `0x${string}`
  payout: bigint
  blockNumber: bigint
}

export function useGlobalStats() {
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN.id })
  const { data: blockNumber } = useBlockNumber({ chainId: TARGET_CHAIN.id, watch: true })
  
  const [lastWin, setLastWin] = useState<LastWin | null>(null)
  const [uniquePlayers, setUniquePlayers] = useState<number>(0)

  // Read game stats from contract
  const { data: statsData, refetch: refetchStats } = useReadContract({
    address: CONTRACTS.hashGame,
    abi: HashGameABI,
    functionName: 'getStats',
    chainId: TARGET_CHAIN.id,
  })

  // Fetch last wins and unique players
  const fetchGlobalData = useCallback(async () => {
    if (!publicClient || !blockNumber) return

    try {
      // Look back ~1000 blocks for recent activity
      const fromBlock = blockNumber > 1000n ? blockNumber - 1000n : 0n
      
      const logs = await publicClient.getLogs({
        address: CONTRACTS.hashGame,
        event: BET_RESOLVED_EVENT,
        fromBlock,
        toBlock: blockNumber,
      })

      // Find last winning bet
      const winningLogs = logs.filter((log: any) => log.args?.won === true)
      if (winningLogs.length > 0) {
        const lastWinLog = winningLogs[winningLogs.length - 1] as any
        setLastWin({
          player: lastWinLog.args.player,
          payout: lastWinLog.args.payout,
          blockNumber: lastWinLog.blockNumber,
        })
      }

      // Count unique players in recent bets
      const uniqueAddresses = new Set(logs.map((log: any) => log.args?.player?.toLowerCase()))
      setUniquePlayers(uniqueAddresses.size)
    } catch (err) {
      console.error('Error fetching global stats:', err)
    }
  }, [publicClient, blockNumber])

  // Fetch on mount and when block changes (every ~10 blocks)
  useEffect(() => {
    fetchGlobalData()
  }, [fetchGlobalData])

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGlobalData()
      refetchStats()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchGlobalData, refetchStats])

  const stats = statsData ? {
    volume: BigInt((statsData as any)[0] || 0),
    burned: BigInt((statsData as any)[1] || 0),
    jackpotPot: BigInt((statsData as any)[2] || 0),
    betsCount: BigInt((statsData as any)[3] || 0),
  } : null

  return {
    // Contract stats
    totalBets: stats?.betsCount ?? 0n,
    totalVolume: stats?.volume ?? 0n,
    jackpotPot: stats?.jackpotPot ?? 0n,
    burned: stats?.burned ?? 0n,
    
    // Computed stats
    uniquePlayers,
    lastWin,
    lastWinFormatted: lastWin ? `${Number(formatEther(lastWin.payout)).toLocaleString(undefined, { maximumFractionDigits: 0 })} $HASH` : null,
    
    // Current block
    blockNumber: blockNumber ?? 0n,
    
    // Refresh
    refetch: () => {
      fetchGlobalData()
      refetchStats()
    }
  }
}
