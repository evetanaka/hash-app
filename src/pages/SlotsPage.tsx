import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useHashToken } from '../hooks/useHashToken'
import { useCyberSlots, LINE_CELLS } from '../hooks/useCyberSlots'
import { useHashStaking } from '../hooks/useHashStaking'
import { Zap, Volume2, VolumeX, Grid3X3, Trophy, Flame, Lock, RotateCcw } from 'lucide-react'

// Cyber-themed symbols for 0-F hex
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '⭐', '7️⃣', '💀', '👑', '🚀', '⚡', '🎰', '💜', '🔮', '☠️']

// Payout info for display
const PAYOUTS_DISPLAY = [
  { match: '3 Match', payout: '15%', probability: '~25%', color: 'text-gray-400' },
  { match: '4 Match', payout: '80%', probability: '~5%', color: 'text-blue-400' },
  { match: '5 Match', payout: '3x', probability: '~0.5%', color: 'text-green-400' },
  { match: '6 Match', payout: '15x', probability: '~0.05%', color: 'text-yellow-400' },
  { match: '7 Match', payout: '80x', probability: '~0.003%', color: 'text-orange-400' },
  { match: '8 Match', payout: '400x', probability: '~0.0001%', color: 'text-red-400' },
  { match: '3 in Line', payout: '1.5x', probability: '~5%', color: 'text-purple-400' },
  { match: '9x ☠️', payout: 'JACKPOT', probability: '~1/687B', color: 'text-yellow-500' },
]

// 8 winning lines (for highlighting)
const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

// Line names for UI
const LINE_NAMES = ['Top Row', 'Middle Row', 'Bottom Row', 'Left Col', 'Center Col', 'Right Col']

const TIER_MAX_BETS: Record<number, bigint> = {
  0: parseEther('100'),
  1: parseEther('500'),
  2: parseEther('2500'),
  3: parseEther('10000'),
  4: parseEther('50000'),
}

export function SlotsPage() {
  const { isConnected } = useAccount()
  const { balance, refetchBalance, slotsAllowance, approveSlots, isApproving, isApproveConfirming, isApproveConfirmed, refetchSlotsAllowance } = useHashToken()
  const { tierInfo, tierName } = useHashStaking()
  const {
    jackpotPool,
    lastResult,
    gameStats,
    spinHistory: onchainHistory,
    respinInfo,
    spin,
    lockCellAndRespin,
    lockLineAndRespin,
    clearResult,
    isSpinning,
    isSpinConfirming,
    isRespinning,
    isRespinConfirming,
    refetchJackpot,
    refetchCanRespin,
  } = useCyberSlots()
  
  const [betAmount, setBetAmount] = useState('100')
  const [displayGrid, setDisplayGrid] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7, 8])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [spinInitiated, setSpinInitiated] = useState(false)
  const [winningCells, setWinningCells] = useState<number[]>([])
  const [winningLines, setWinningLines] = useState<number[][]>([])
  const [showRespinUI, setShowRespinUI] = useState(false)
  const [selectedCell, setSelectedCell] = useState<number | null>(null)
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  
  const minBet = parseEther('5')
  const maxBet = TIER_MAX_BETS[tierInfo?.tier ?? 0] || parseEther('100')
  
  useEffect(() => {
    if (isApproveConfirmed) refetchSlotsAllowance()
  }, [isApproveConfirmed, refetchSlotsAllowance])
  
  const needsApproval = slotsAllowance < parseEther(betAmount || '0')
  
  // Animation while spinning
  useEffect(() => {
    if (spinInitiated) {
      setWinningCells([])
      setWinningLines([])
      setShowRespinUI(false)
      const interval = setInterval(() => {
        setDisplayGrid(Array(9).fill(0).map(() => Math.floor(Math.random() * 16)))
      }, 80)
      return () => clearInterval(interval)
    }
  }, [spinInitiated])
  
  // Find matching cells
  const findMatchingCells = useCallback((grid: number[]) => {
    const counts: Record<number, number[]> = {}
    grid.forEach((symbol, idx) => {
      if (!counts[symbol]) counts[symbol] = []
      counts[symbol].push(idx)
    })
    let maxIndices: number[] = []
    Object.values(counts).forEach(indices => {
      if (indices.length >= 3 && indices.length > maxIndices.length) {
        maxIndices = indices
      }
    })
    return maxIndices
  }, [])
  
  // Find winning lines
  const findWinningLines = useCallback((grid: number[]) => {
    const lines: number[][] = []
    WINNING_LINES.forEach(line => {
      if (grid[line[0]] === grid[line[1]] && grid[line[1]] === grid[line[2]]) {
        lines.push(line)
      }
    })
    return lines
  }, [])
  
  // Update display when result arrives
  useEffect(() => {
    if (lastResult) {
      setSpinInitiated(false)
      setDisplayGrid(lastResult.grid)
      setWinningCells(findMatchingCells(lastResult.grid))
      setWinningLines(findWinningLines(lastResult.grid))
      refetchBalance()
      refetchJackpot()
      refetchCanRespin()
      // Show respin UI after delay
      setTimeout(() => setShowRespinUI(true), 800)
    }
  }, [lastResult, refetchBalance, refetchJackpot, refetchCanRespin, findMatchingCells, findWinningLines])
  
  const handleSpin = useCallback(() => {
    if (spinInitiated || isSpinning || isSpinConfirming) return
    const amount = parseEther(betAmount || '0')
    if (amount < minBet || amount > maxBet || amount > balance) return
    
    setSpinInitiated(true)
    setSelectedCell(null)
    setSelectedLine(null)
    clearResult()
    spin(amount)
  }, [betAmount, balance, minBet, maxBet, spinInitiated, isSpinning, isSpinConfirming, clearResult, spin])
  
  const handleCellLock = (cellIndex: number) => {
    if (!showRespinUI || !respinInfo?.eligible) return
    setSelectedCell(selectedCell === cellIndex ? null : cellIndex)
    setSelectedLine(null)
  }
  
  const handleLineLock = (lineIndex: number) => {
    if (!showRespinUI || !respinInfo?.eligible) return
    setSelectedLine(selectedLine === lineIndex ? null : lineIndex)
    setSelectedCell(null)
  }
  
  const handleRespin = () => {
    if (selectedCell !== null) {
      setSpinInitiated(true)
      lockCellAndRespin(selectedCell)
    } else if (selectedLine !== null) {
      setSpinInitiated(true)
      lockLineAndRespin(selectedLine)
    }
  }
  
  const isProcessing = spinInitiated || isSpinning || isSpinConfirming || isRespinning || isRespinConfirming
  const betAmountBigInt = parseEther(betAmount || '0')
  const canSpin = betAmountBigInt >= minBet && betAmountBigInt <= maxBet && betAmountBigInt <= balance && !isProcessing && !needsApproval
  
  const respinCost = selectedCell !== null ? respinInfo?.cellCost : selectedLine !== null ? respinInfo?.lineCost : 0n
  const canRespin = respinInfo?.eligible && (selectedCell !== null || selectedLine !== null) && (respinCost || 0n) <= balance

  // Get selected line cells
  const selectedLineCells = selectedLine !== null ? LINE_CELLS[selectedLine] : []

  // Win description
  const getWinDescription = () => {
    if (!lastResult) return null
    if (lastResult.isJackpot) return { text: '🎉 JACKPOT!!! 🎉', color: 'text-yellow-400' }
    if (lastResult.maxMatch >= 8) return { text: '🔥 8 MATCH! 400x 🔥', color: 'text-red-400' }
    if (lastResult.maxMatch >= 7) return { text: '💎 7 MATCH! 80x 💎', color: 'text-orange-400' }
    if (lastResult.maxMatch >= 6) return { text: '⭐ 6 MATCH! 15x ⭐', color: 'text-yellow-400' }
    if (lastResult.maxMatch >= 5) return { text: '🚀 5 MATCH! 3x 🚀', color: 'text-green-400' }
    if (lastResult.maxMatch >= 4) return { text: '✨ 4 MATCH! 80% ✨', color: 'text-blue-400' }
    if (lastResult.linesHit > 0) return { text: `📐 ${lastResult.linesHit} LINE${lastResult.linesHit > 1 ? 'S' : ''}!`, color: 'text-purple-400' }
    if (lastResult.maxMatch >= 3) return { text: '👍 3 MATCH! 15%', color: 'text-gray-400' }
    return null
  }
  const winInfo = getWinDescription()

  return (
    <main className="max-w-6xl mx-auto mt-4 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
            <Grid3X3 className="text-purple-400" /> CYBER_SLOTS V5
          </h1>
          <p className="text-gray-500 text-sm">3x3 GRID • LOCK & RESPIN • PROGRESSIVE PAYOUTS</p>
        </div>
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 border border-gray-700 hover:border-purple-400 transition-colors"
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Game Area */}
        <div className="lg:col-span-2">
          {/* Progressive Jackpot */}
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/50 p-4 mb-6 text-center">
            <div className="text-xs text-purple-300 uppercase tracking-wider flex items-center justify-center gap-2">
              <Trophy size={14} /> Progressive Jackpot
            </div>
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse">
              {Number(formatEther(jackpotPool)).toLocaleString(undefined, { maximumFractionDigits: 0 })} $HASH
            </div>
            <div className="text-xs text-gray-500">Hit 9x ☠️ to win it all!</div>
          </div>
          
          {/* 3x3 Grid */}
          <div className="bg-black border-2 border-purple-500/50 p-6 mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />
            
            {/* Grid */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-6">
              {displayGrid.map((symbol, i) => {
                const isWinning = winningCells.includes(i)
                const isInLine = winningLines.some(line => line.includes(i))
                const isCellSelected = selectedCell === i
                const isLineSelected = selectedLineCells.includes(i)
                const isLocked = isCellSelected || isLineSelected
                
                return (
                  <div 
                    key={i}
                    onClick={() => showRespinUI && respinInfo?.eligible && handleCellLock(i)}
                    className={`
                      aspect-square flex items-center justify-center text-4xl md:text-5xl relative
                      bg-gray-900 border-2 transition-all duration-200
                      ${isProcessing && !isLocked ? 'animate-pulse border-purple-400' : ''}
                      ${isWinning && !showRespinUI ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)] bg-green-900/20' : ''}
                      ${isInLine && !isWinning && !showRespinUI ? 'border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : ''}
                      ${isLocked ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)] bg-yellow-900/20' : ''}
                      ${!isWinning && !isInLine && !isLocked ? 'border-purple-400/30' : ''}
                      ${showRespinUI && respinInfo?.eligible && !isLocked ? 'cursor-pointer hover:border-yellow-400/50 hover:scale-105' : ''}
                    `}
                  >
                    <span className={isWinning && !showRespinUI ? 'animate-bounce' : ''}>
                      {SYMBOLS[symbol]}
                    </span>
                    {isLocked && (
                      <div className="absolute top-1 right-1">
                        <Lock size={14} className="text-yellow-400" fill="currentColor" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Result / Respin UI */}
            <div className="min-h-[100px] flex flex-col items-center justify-center mb-4">
              {lastResult && winInfo && !showRespinUI ? (
                <div className="text-center">
                  <div className={`text-xl font-bold ${winInfo.color}`}>{winInfo.text}</div>
                  {lastResult.payout > 0n && (
                    <div className="text-lg text-white">+{Number(formatEther(lastResult.payout)).toLocaleString()} $HASH</div>
                  )}
                </div>
              ) : isProcessing ? (
                <div className="text-xl text-purple-400 animate-pulse flex items-center gap-2">
                  <Zap className="animate-spin" size={20} /> {isRespinning || isRespinConfirming ? 'Respinning...' : 'Spinning...'}
                </div>
              ) : showRespinUI && respinInfo?.eligible ? (
                <div className="w-full max-w-md space-y-3">
                  {lastResult && winInfo && (
                    <div className={`text-center font-bold ${winInfo.color}`}>
                      {winInfo.text} {lastResult.payout > 0n && `+${Number(formatEther(lastResult.payout)).toLocaleString()}`}
                    </div>
                  )}
                  
                  <div className="border border-yellow-500/50 bg-yellow-500/10 p-4 rounded">
                    <div className="text-sm text-yellow-400 mb-3 flex items-center justify-center gap-2">
                      <RotateCcw size={16} /> Lock & Respin
                    </div>
                    
                    {/* Lock options */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-400">Lock 1 Cell (50%)</div>
                        <div className="text-xs text-yellow-400">Click any cell above</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-400">Lock 1 Line (100%)</div>
                        <div className="flex flex-wrap gap-1">
                          {[0, 1, 2, 3, 4, 5].map(i => (
                            <button
                              key={i}
                              onClick={() => handleLineLock(i)}
                              className={`text-[10px] px-1.5 py-0.5 border transition-colors ${
                                selectedLine === i 
                                  ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400' 
                                  : 'border-gray-600 text-gray-400 hover:border-yellow-400/50'
                              }`}
                            >
                              {LINE_NAMES[i]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Selection info */}
                    {(selectedCell !== null || selectedLine !== null) && (
                      <div className="text-center mb-3 text-sm">
                        <span className="text-yellow-400">
                          {selectedCell !== null ? `Cell ${selectedCell} locked` : `${LINE_NAMES[selectedLine!]} locked`}
                        </span>
                        <span className="text-gray-400"> • Cost: </span>
                        <span className="text-yellow-400 font-bold">
                          {Number(formatEther(respinCost || 0n)).toLocaleString()} $HASH
                        </span>
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={handleRespin}
                        disabled={!canRespin || isProcessing}
                        className={`px-6 py-2 font-bold border-2 transition-all flex items-center gap-2 ${
                          canRespin && !isProcessing
                            ? 'bg-yellow-500 text-black border-yellow-400 hover:bg-yellow-400'
                            : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                        }`}
                      >
                        <RotateCcw size={16} /> RESPIN
                      </button>
                      <button
                        onClick={() => {
                          setShowRespinUI(false)
                          setSelectedCell(null)
                          setSelectedLine(null)
                        }}
                        className="px-4 py-2 border border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white"
                      >
                        SKIP
                      </button>
                    </div>
                  </div>
                </div>
              ) : lastResult && lastResult.payout === 0n ? (
                <div className="text-gray-500">No win. Try again!</div>
              ) : null}
            </div>
            
            {/* Bet controls */}
            {isConnected && !showRespinUI && (
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Balance: <span className="text-white">{Number(formatEther(balance)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> $HASH</span>
                  <span>Tier: <span className="text-purple-400">{tierName || 'NONE'}</span></span>
                </div>
                
                {needsApproval && balance > 0n && (
                  <div className="border border-yellow-500/50 bg-yellow-500/10 p-3 text-center">
                    <div className="text-sm text-yellow-400 mb-2">Approve $HASH for CyberSlots</div>
                    <button 
                      onClick={() => approveSlots()}
                      disabled={isApproving || isApproveConfirming}
                      className="px-4 py-2 bg-yellow-500 text-black font-bold hover:bg-yellow-400 disabled:opacity-50"
                    >
                      {isApproving || isApproveConfirming ? 'APPROVING...' : 'APPROVE'}
                    </button>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <div className="relative flex-grow">
                    <input 
                      type="number" 
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      disabled={isProcessing}
                      className={`w-full bg-black border py-3 pl-4 pr-20 font-mono text-lg focus:outline-none ${
                        betAmountBigInt < minBet || betAmountBigInt > maxBet 
                          ? 'border-red-500' 
                          : 'border-purple-500/50 focus:border-purple-400'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$HASH</span>
                  </div>
                  <button 
                    onClick={handleSpin}
                    disabled={!canSpin}
                    className={`w-36 py-3 font-bold border-2 transition-all uppercase tracking-wider ${
                      !canSpin
                        ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed' 
                        : 'bg-purple-600 text-white border-purple-400 hover:bg-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                    }`}
                  >
                    {isProcessing ? 'SPINNING...' : 'SPIN'}
                  </button>
                </div>
                
                <div className="flex gap-2">
                  {[5, 25, 50, 100, 500].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setBetAmount(amt.toString())}
                      disabled={isProcessing}
                      className="flex-1 py-1 text-xs border border-purple-700 text-purple-400 hover:border-purple-400 hover:text-white transition-colors"
                    >
                      {amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setBetAmount(formatEther(balance < maxBet ? balance : maxBet))}
                    disabled={isProcessing}
                    className="flex-1 py-1 text-xs border border-purple-700 text-purple-400 hover:border-purple-400 hover:text-white transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Recent Spins */}
          <div className="bg-black border border-purple-500/30 p-4">
            <h3 className="text-sm font-bold text-purple-400 mb-3 uppercase">Recent Spins</h3>
            <div className="space-y-2 text-xs max-h-40 overflow-y-auto">
              {onchainHistory.length === 0 ? (
                <div className="text-gray-600">No spins yet...</div>
              ) : (
                onchainHistory.map((spin, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <div className="flex gap-1">
                      {spin.grid.slice(0, 9).map((s, j) => (
                        <span key={j} className="text-base">{SYMBOLS[s]}</span>
                      ))}
                    </div>
                    <div className={spin.payout > 0n ? 'text-green-400 font-bold' : 'text-red-400'}>
                      {spin.payout > 0n ? `+${Number(formatEther(spin.payout)).toLocaleString()}` : 'No win'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Lock & Respin Info */}
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/50 p-4">
            <h3 className="text-sm font-bold text-yellow-400 mb-3 uppercase flex items-center gap-2">
              <Lock size={16} /> Lock & Respin
            </h3>
            <div className="text-xs text-gray-300 space-y-2">
              <div className="flex justify-between">
                <span>Lock 1 Cell</span>
                <span className="text-yellow-400 font-bold">50% of bet</span>
              </div>
              <div className="flex justify-between">
                <span>Lock 1 Line (3 cells)</span>
                <span className="text-yellow-400 font-bold">100% of bet</span>
              </div>
              <p className="text-gray-500 pt-2 border-t border-gray-700">
                After spinning, lock your best symbols and respin the rest!
              </p>
            </div>
          </div>
          
          {/* Payout Table */}
          <div className="bg-black border border-purple-500/30 p-4">
            <h3 className="text-sm font-bold text-purple-400 mb-4 uppercase flex items-center gap-2">
              <Flame size={16} /> Payout Table
            </h3>
            <div className="space-y-2">
              {PAYOUTS_DISPLAY.map((p, i) => (
                <div 
                  key={i} 
                  className={`flex justify-between items-center p-2 border border-gray-800 ${
                    p.match === '9x ☠️' ? 'bg-gradient-to-r from-yellow-900/30 to-red-900/30 border-yellow-500/50' : ''
                  }`}
                >
                  <div>
                    <div className={`font-bold text-sm ${p.color}`}>{p.match}</div>
                    <div className="text-[10px] text-gray-500">{p.probability}</div>
                  </div>
                  <div className={`text-lg font-bold ${p.color}`}>{p.payout}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Stats */}
          <div className="bg-black border border-gray-800 p-4">
            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase">Global Stats</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: 'Spins', val: gameStats?.totalSpins?.toString() ?? '—' },
                { label: 'Wagered', val: gameStats ? `${(Number(formatEther(gameStats.totalWagered)) / 1000).toFixed(0)}K` : '—' },
                { label: 'Paid Out', val: gameStats ? `${(Number(formatEther(gameStats.totalPaidOut)) / 1000).toFixed(0)}K` : '—' },
                { label: 'Burned', val: gameStats ? `${(Number(formatEther(gameStats.totalBurned)) / 1000).toFixed(0)}K` : '—' },
              ].map(stat => (
                <div key={stat.label} className="text-center p-2 bg-gray-900/50">
                  <div className="text-gray-500">{stat.label}</div>
                  <div className="text-white font-bold">{stat.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
