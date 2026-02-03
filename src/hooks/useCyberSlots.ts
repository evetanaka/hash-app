import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient } from 'wagmi'
import { useState, useEffect, useCallback, useRef } from 'react'
import { CONTRACTS, TARGET_CHAIN } from '../config/wagmi'
import { CyberSlotsABI } from '../abi/CyberSlotsABI'
import { decodeEventLog } from 'viem'

// Gas estimation config
const GAS_BUFFER_PERCENT = 15n  // +15% buffer on estimation
const RETRY_GAS_MULTIPLIER = 150n  // +50% on retry
const DEFAULT_GAS = 350_000n  // Fallback if estimation fails

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

export interface GasError {
  type: 'estimation' | 'execution'
  message: string
  suggestedGas: bigint
  retryFn: () => void
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
  const publicClient = usePublicClient()
  const [lastResult, setLastResult] = useState<SpinResult | null>(null)
  const [gasError, setGasError] = useState<GasError | null>(null)
  const lastGasUsedRef = useRef<bigint>(DEFAULT_GAS)
  
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
  
  // Helper: add gas buffer
  const addGasBuffer = useCallback((gas: bigint, bufferPercent: bigint = GAS_BUFFER_PERCENT) => {
    return (gas * (100n + bufferPercent)) / 100n
  }, [])

  // Estimate gas for spin
  const estimateSpinGas = useCallback(async (amount: bigint): Promise<bigint> => {
    if (!publicClient || !address) return DEFAULT_GAS
    try {
      const estimated = await publicClient.estimateContractGas({
        address: CONTRACTS.cyberSlots,
        abi: CyberSlotsABI,
        functionName: 'spin',
        args: [amount],
        account: address,
      })
      return addGasBuffer(estimated)
    } catch (err) {
      console.warn('Gas estimation failed, using default:', err)
      return DEFAULT_GAS
    }
  }, [publicClient, address, addGasBuffer])

  // Estimate gas for cell respin
  const estimateCellRespinGas = useCallback(async (cellIndex: number): Promise<bigint> => {
    if (!publicClient || !address) return DEFAULT_GAS
    try {
      const estimated = await publicClient.estimateContractGas({
        address: CONTRACTS.cyberSlots,
        abi: CyberSlotsABI,
        functionName: 'lockCellAndRespin',
        args: [cellIndex],
        account: address,
      })
      return addGasBuffer(estimated)
    } catch (err) {
      console.warn('Gas estimation failed, using default:', err)
      return DEFAULT_GAS
    }
  }, [publicClient, address, addGasBuffer])

  // Estimate gas for line respin
  const estimateLineRespinGas = useCallback(async (lineIndex: number): Promise<bigint> => {
    if (!publicClient || !address) return DEFAULT_GAS
    try {
      const estimated = await publicClient.estimateContractGas({
        address: CONTRACTS.cyberSlots,
        abi: CyberSlotsABI,
        functionName: 'lockLineAndRespin',
        args: [lineIndex],
        account: address,
      })
      return addGasBuffer(estimated)
    } catch (err) {
      console.warn('Gas estimation failed, using default:', err)
      return DEFAULT_GAS
    }
  }, [publicClient, address, addGasBuffer])

  // Helper: detect gas-related errors
  const isGasError = (error: any): boolean => {
    const msg = error?.message?.toLowerCase() || ''
    return msg.includes('out of gas') || 
           msg.includes('gas required exceeds') ||
           msg.includes('intrinsic gas too low') ||
           msg.includes('execution reverted') ||
           error?.code === 'UNPREDICTABLE_GAS_LIMIT'
  }

  // Actions
  const spin = useCallback(async (amount: bigint, overrideGas?: bigint) => {
    setLastResult(null)
    setGasError(null)
    
    try {
      // Estimate gas with buffer
      const estimatedGas = overrideGas || await estimateSpinGas(amount)
      lastGasUsedRef.current = estimatedGas
      
      writeSpin({
        address: CONTRACTS.cyberSlots,
        abi: CyberSlotsABI,
        functionName: 'spin',
        args: [amount],
        chainId: TARGET_CHAIN.id,
        gas: estimatedGas,
      })
    } catch (err: any) {
      if (isGasError(err)) {
        const retryGas = addGasBuffer(lastGasUsedRef.current, RETRY_GAS_MULTIPLIER)
        setGasError({
          type: 'estimation',
          message: 'Gas estimation failed. Try with higher gas?',
          suggestedGas: retryGas,
          retryFn: () => spin(amount, retryGas),
        })
      } else {
        throw err
      }
    }
  }, [writeSpin, estimateSpinGas, addGasBuffer])
  
  const lockCellAndRespin = useCallback(async (cellIndex: number, overrideGas?: bigint) => {
    setLastResult(null)
    setGasError(null)
    
    try {
      const estimatedGas = overrideGas || await estimateCellRespinGas(cellIndex)
      lastGasUsedRef.current = estimatedGas
      
      writeCellRespin({
        address: CONTRACTS.cyberSlots,
        abi: CyberSlotsABI,
        functionName: 'lockCellAndRespin',
        args: [cellIndex],
        chainId: TARGET_CHAIN.id,
        gas: estimatedGas,
      })
    } catch (err: any) {
      if (isGasError(err)) {
        const retryGas = addGasBuffer(lastGasUsedRef.current, RETRY_GAS_MULTIPLIER)
        setGasError({
          type: 'estimation',
          message: 'Gas estimation failed. Try with higher gas?',
          suggestedGas: retryGas,
          retryFn: () => lockCellAndRespin(cellIndex, retryGas),
        })
      } else {
        throw err
      }
    }
  }, [writeCellRespin, estimateCellRespinGas, addGasBuffer])
  
  const lockLineAndRespin = useCallback(async (lineIndex: number, overrideGas?: bigint) => {
    setLastResult(null)
    setGasError(null)
    
    try {
      const estimatedGas = overrideGas || await estimateLineRespinGas(lineIndex)
      lastGasUsedRef.current = estimatedGas
      
      writeLineRespin({
        address: CONTRACTS.cyberSlots,
        abi: CyberSlotsABI,
        functionName: 'lockLineAndRespin',
        args: [lineIndex],
        chainId: TARGET_CHAIN.id,
        gas: estimatedGas,
      })
    } catch (err: any) {
      if (isGasError(err)) {
        const retryGas = addGasBuffer(lastGasUsedRef.current, RETRY_GAS_MULTIPLIER)
        setGasError({
          type: 'estimation',
          message: 'Gas estimation failed. Try with higher gas?',
          suggestedGas: retryGas,
          retryFn: () => lockLineAndRespin(lineIndex, retryGas),
        })
      } else {
        throw err
      }
    }
  }, [writeLineRespin, estimateLineRespinGas, addGasBuffer])
  
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
  
  // Clear gas error when transaction succeeds
  useEffect(() => {
    if (spinConfirmed || cellRespinConfirmed || lineRespinConfirmed) {
      setGasError(null)
    }
  }, [spinConfirmed, cellRespinConfirmed, lineRespinConfirmed])

  return {
    // State
    jackpotPool: jackpotPool ? BigInt(jackpotPool.toString()) : 0n,
    lastResult,
    gameStats,
    spinHistory,
    respinInfo,
    gasError,
    
    // Actions
    spin,
    lockCellAndRespin,
    lockLineAndRespin,
    clearResult: () => setLastResult(null),
    clearGasError: () => setGasError(null),
    retryWithMoreGas: () => gasError?.retryFn?.(),
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
