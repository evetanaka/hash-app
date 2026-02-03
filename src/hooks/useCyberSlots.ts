import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { useState, useEffect, useCallback } from 'react'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { CyberSlotsABI } from '../abi/CyberSlotsABI'
import { decodeEventLog } from 'viem'

export interface SpinResult {
  spinId: bigint
  grid: number[]
  maxMatch: number
  linesHit: number
  isJackpot: boolean
  payout: bigint
}

export interface SpinHistory {
  player: string
  amount: bigint
  grid: number[]
  maxMatch: number
  linesHit: number
  isJackpot: boolean
  payout: bigint
  timestamp: bigint
}

export interface RespinInfo {
  eligible: boolean
  originalSpinId: bigint
  originalGrid: number[]
  blocksRemaining: bigint
  cellCost: bigint
  lineCost: bigint
}

// Lines: 0-2 rows, 3-5 columns
export const LINE_CELLS: Record<number, number[]> = {
  0: [0, 1, 2], // Top row
  1: [3, 4, 5], // Middle row
  2: [6, 7, 8], // Bottom row
  3: [0, 3, 6], // Left column
  4: [1, 4, 7], // Center column
  5: [2, 5, 8], // Right column
}

export function useCyberSlots() {
  const { address } = useAccount()
  const [lastResult, setLastResult] = useState<SpinResult | null>(null)
  
  // Read jackpot pool
  const { data: jackpotPool, refetch: refetchJackpot } = useReadContract({
    address: CONTRACTS.cyberSlots,
    abi: CyberSlotsABI,
    functionName: 'getJackpotPool',
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
  
  // Read respin info
  const { data: canRespinData, refetch: refetchCanRespin } = useReadContract({
    address: CONTRACTS.cyberSlots,
    abi: CyberSlotsABI,
    functionName: 'canRespin',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN.id,
    query: { enabled: !!address }
  })
  
  // Spin transaction
  const { writeContract: writeSpin, data: spinTxHash, isPending: isSpinning, reset: resetSpin } = useWriteContract()
  const { data: spinReceipt, isLoading: isSpinConfirming, isSuccess: spinConfirmed } = useWaitForTransactionReceipt({ hash: spinTxHash })
  
  // Cell respin transaction
  const { writeContract: writeCellRespin, data: cellRespinTxHash, isPending: isCellRespinning } = useWriteContract()
  const { data: cellRespinReceipt, isLoading: isCellRespinConfirming, isSuccess: cellRespinConfirmed } = useWaitForTransactionReceipt({ hash: cellRespinTxHash })
  
  // Line respin transaction
  const { writeContract: writeLineRespin, data: lineRespinTxHash, isPending: isLineRespinning } = useWriteContract()
  const { data: lineRespinReceipt, isLoading: isLineRespinConfirming, isSuccess: lineRespinConfirmed } = useWaitForTransactionReceipt({ hash: lineRespinTxHash })
  
  // Parse spin result from transaction receipt
  const parseSpinResult = useCallback((receipt: any) => {
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: CyberSlotsABI,
          data: log.data,
          topics: log.topics,
        })
        
        if (decoded.eventName === 'SpinCompleted' || decoded.eventName === 'CellRespin' || decoded.eventName === 'LineRespin') {
          const args = decoded.args as any
          const grid = args.grid || args.newGrid
          setLastResult({
            spinId: args.spinId || args.newSpinId,
            grid: Array.from(grid).map(Number),
            maxMatch: Number(args.maxMatch),
            linesHit: Number(args.linesHit),
            isJackpot: Number(args.maxMatch) === 9 && grid.every((s: number) => s === 15),
            payout: args.payout,
          })
          break
        }
      } catch {
        // Not our event
      }
    }
    
    refetchJackpot()
    refetchStats()
    refetchHistory()
    refetchCanRespin()
  }, [refetchJackpot, refetchStats, refetchHistory, refetchCanRespin])
  
  useEffect(() => {
    if (spinReceipt && spinConfirmed) parseSpinResult(spinReceipt)
  }, [spinReceipt, spinConfirmed, parseSpinResult])
  
  useEffect(() => {
    if (cellRespinReceipt && cellRespinConfirmed) parseSpinResult(cellRespinReceipt)
  }, [cellRespinReceipt, cellRespinConfirmed, parseSpinResult])
  
  useEffect(() => {
    if (lineRespinReceipt && lineRespinConfirmed) parseSpinResult(lineRespinReceipt)
  }, [lineRespinReceipt, lineRespinConfirmed, parseSpinResult])
  
  // Actions
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
  
  const lockCellAndRespin = useCallback((cellIndex: number) => {
    setLastResult(null)
    writeCellRespin({
      address: CONTRACTS.cyberSlots,
      abi: CyberSlotsABI,
      functionName: 'lockCellAndRespin',
      args: [cellIndex],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeCellRespin])
  
  const lockLineAndRespin = useCallback((lineIndex: number) => {
    setLastResult(null)
    writeLineRespin({
      address: CONTRACTS.cyberSlots,
      abi: CyberSlotsABI,
      functionName: 'lockLineAndRespin',
      args: [lineIndex],
      chainId: TARGET_CHAIN.id,
    })
  }, [writeLineRespin])
  
  // Parse respin info
  const respinInfo: RespinInfo | null = canRespinData ? {
    eligible: (canRespinData as any)[0],
    originalSpinId: BigInt((canRespinData as any)[1]),
    originalGrid: Array.from((canRespinData as any)[2]).map(Number),
    blocksRemaining: BigInt((canRespinData as any)[3]),
    cellCost: BigInt((canRespinData as any)[4]),
    lineCost: BigInt((canRespinData as any)[5]),
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
    grid: Array.from(s.grid).map(Number),
    maxMatch: Number(s.maxMatch),
    linesHit: Number(s.linesHit),
    isJackpot: s.isJackpot,
    payout: BigInt(s.payout),
    timestamp: BigInt(s.timestamp),
  })) : []
  
  const isRespinning = isCellRespinning || isLineRespinning
  const isRespinConfirming = isCellRespinConfirming || isLineRespinConfirming
  
  return {
    // State
    jackpotPool: jackpotPool ? BigInt(jackpotPool.toString()) : 0n,
    lastResult,
    gameStats,
    spinHistory,
    respinInfo,
    
    // Actions
    spin,
    lockCellAndRespin,
    lockLineAndRespin,
    clearResult: () => setLastResult(null),
    resetSpin,
    
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
