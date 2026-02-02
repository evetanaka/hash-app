import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useHashToken } from '../hooks/useHashToken'
import { useCyberSlots, WinType } from '../hooks/useCyberSlots'
import { useHashStaking } from '../hooks/useHashStaking'
import { Zap, Volume2, VolumeX, Lock, RotateCcw } from 'lucide-react'

// Cyber-themed symbols
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '⭐', '7️⃣', '💀', '👑', '🚀', '⚡', '🎰', '💜', '🔮', '☠️']
const SYMBOL_NAMES = ['CHERRY', 'LEMON', 'ORANGE', 'GRAPE', 'BELL', 'DIAMOND', 'STAR', 'SEVEN', 'SKULL', 'CROWN', 'ROCKET', 'BOLT', 'SLOT', 'NEON', 'CYBER', 'JACKPOT']

// Payout info
const PAYOUTS = {
  jackpot: { mult: 'JACKPOT', desc: '☠️☠️☠️ Jackpot Pool' },
  threeOfKind: { mult: '5x', desc: 'Three of a kind' },
  sequential: { mult: '3x', desc: 'Sequential (e.g. 4-5-6)' },
  twoOfKind: { mult: '1.5x', desc: 'Two of a kind' },
}

// Tier max bets
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
    lockAndRespin,
    clearResult,
    isSpinning,
    isSpinConfirming,
    isRespinning,
    isRespinConfirming,
    refetchJackpot,
    refetchCanRespin,
  } = useCyberSlots()
  
  const [betAmount, setBetAmount] = useState('100')
  const [displayReels, setDisplayReels] = useState([0, 0, 0])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [spinInitiated, setSpinInitiated] = useState(false)
  const [lockedReels, setLockedReels] = useState<[boolean, boolean, boolean]>([false, false, false])
  const [showRespinUI, setShowRespinUI] = useState(false)
  
  // Calculate limits
  const minBet = parseEther('5')
  const maxBet = TIER_MAX_BETS[tierInfo?.tier ?? 0] || parseEther('100')
  
  // Refetch allowance when approve confirmed
  useEffect(() => {
    if (isApproveConfirmed) {
      refetchSlotsAllowance()
    }
  }, [isApproveConfirmed, refetchSlotsAllowance])
  
  // Check if approved for CyberSlots
  const needsApproval = slotsAllowance < parseEther(betAmount || '0')
  
  // Animation while spinning (starts immediately on click)
  useEffect(() => {
    if (spinInitiated) {
      const interval = setInterval(() => {
        setDisplayReels([
          Math.floor(Math.random() * 16),
          Math.floor(Math.random() * 16),
          Math.floor(Math.random() * 16),
        ])
      }, 50)
      return () => clearInterval(interval)
    }
  }, [spinInitiated])
  
  // Update display when result arrives
  useEffect(() => {
    if (lastResult) {
      setSpinInitiated(false) // Stop animation
      setDisplayReels([...lastResult.result])
      setLockedReels([false, false, false]) // Reset locks
      refetchBalance()
      refetchJackpot()
      refetchCanRespin()
      // Show respin UI after a short delay
      setTimeout(() => setShowRespinUI(true), 500)
    }
  }, [lastResult, refetchBalance, refetchJackpot, refetchCanRespin])
  
  // Hide respin UI when starting new spin
  useEffect(() => {
    if (spinInitiated || isRespinning || isRespinConfirming) {
      setShowRespinUI(false)
    }
  }, [spinInitiated, isRespinning, isRespinConfirming])
  
  const handleSpin = useCallback(() => {
    if (spinInitiated || isSpinning || isSpinConfirming) return
    
    const amount = parseEther(betAmount || '0')
    if (amount < minBet || amount > maxBet || amount > balance) return
    
    setSpinInitiated(true) // Start animation immediately
    setLockedReels([false, false, false])
    setShowRespinUI(false)
    clearResult()
    spin(amount)
  }, [betAmount, balance, minBet, maxBet, spinInitiated, isSpinning, isSpinConfirming, clearResult, spin])
  
  const handleRespin = useCallback(() => {
    if (isRespinning || isRespinConfirming) return
    
    const lockCount = lockedReels.filter(Boolean).length
    if (lockCount === 0 || lockCount === 3) return
    
    setSpinInitiated(true)
    lockAndRespin(lockedReels[0], lockedReels[1], lockedReels[2])
  }, [lockedReels, isRespinning, isRespinConfirming, lockAndRespin])
  
  const toggleLock = (index: number) => {
    if (!respinInfo?.eligible || isRespinning || isRespinConfirming) return
    const newLocks: [boolean, boolean, boolean] = [...lockedReels]
    newLocks[index] = !newLocks[index]
    setLockedReels(newLocks)
  }
  
  const isProcessing = spinInitiated || isSpinning || isSpinConfirming || isRespinning || isRespinConfirming
  const lockCount = lockedReels.filter(Boolean).length
  const respinCost = lockCount === 1 ? respinInfo?.cost1Lock : lockCount === 2 ? respinInfo?.cost2Lock : 0n
  const canRespin = respinInfo?.eligible && lockCount > 0 && lockCount < 3 && (respinCost || 0n) <= balance
  const betAmountBigInt = parseEther(betAmount || '0')
  const canSpin = betAmountBigInt >= minBet && betAmountBigInt <= maxBet && betAmountBigInt <= balance && !isProcessing && !needsApproval

  // Win type to display string
  const getWinTypeDisplay = (type: number) => {
    switch (type) {
      case WinType.JACKPOT: return 'JACKPOT!!!'
      case WinType.THREE_OF_KIND: return 'THREE OF A KIND!'
      case WinType.SEQUENTIAL: return 'SEQUENTIAL!'
      case WinType.TWO_OF_KIND: return 'TWO OF A KIND!'
      default: return ''
    }
  }

  return (
    <main className="max-w-4xl mx-auto mt-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
            <Zap className="text-purple-400" /> CYBER_SLOTS
          </h1>
          <p className="text-gray-500 text-sm">HIGH VOLATILITY. INSTANT RESULTS.</p>
        </div>
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 border border-gray-700 hover:border-purple-400 transition-colors"
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>
      
      {/* Progressive Jackpot */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/50 p-4 mb-6 text-center">
        <div className="text-xs text-purple-300 uppercase tracking-wider">Progressive Jackpot</div>
        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse">
          {Number(formatEther(jackpotPool)).toLocaleString(undefined, { maximumFractionDigits: 0 })} $HASH
        </div>
        <div className="text-xs text-gray-500">Hit ☠️☠️☠️ to win it all!</div>
      </div>
      
      {/* Slot Machine */}
      <div className="bg-black border-2 border-purple-500/50 p-6 mb-6 relative overflow-hidden w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />
        
        {/* Reels - Clickable for Lock & Respin */}
        <div className="flex justify-center gap-4 mb-6">
          {displayReels.map((symbol, i) => (
            <div 
              key={i}
              onClick={() => showRespinUI && respinInfo?.eligible && toggleLock(i)}
              className={`
                w-24 h-24 md:w-32 md:h-32 flex-shrink-0 relative
                bg-gray-900 border-2 
                flex items-center justify-center text-5xl md:text-6xl
                transition-all duration-200
                ${isProcessing && !lockedReels[i] ? 'animate-pulse border-purple-400' : ''}
                ${lastResult && lastResult.winType !== WinType.NONE && !showRespinUI ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]' : ''}
                ${lockedReels[i] ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'border-purple-400/50'}
                ${showRespinUI && respinInfo?.eligible && !lockedReels[i] ? 'cursor-pointer hover:border-yellow-400/70 hover:scale-105' : ''}
              `}
            >
              {SYMBOLS[symbol]}
              
              {/* Lock overlay */}
              {lockedReels[i] && (
                <div className="absolute inset-0 bg-yellow-400/20 flex items-center justify-center">
                  <div className="absolute top-1 right-1">
                    <Lock className="w-5 h-5 text-yellow-400" fill="currentColor" />
                  </div>
                </div>
              )}
              
              {/* Hover hint when respin available */}
              {showRespinUI && respinInfo?.eligible && !lockedReels[i] && !isProcessing && (
                <div className="absolute inset-0 bg-purple-400/0 hover:bg-purple-400/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <span className="text-xs text-purple-300 bg-black/80 px-2 py-1 rounded">LOCK</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Symbol names */}
        <div className="flex justify-center gap-4 mb-6">
          {displayReels.map((symbol, i) => (
            <div key={i} className="w-24 md:w-32 flex-shrink-0 text-center text-xs text-gray-500 font-mono truncate">
              {SYMBOL_NAMES[symbol]}
            </div>
          ))}
        </div>
        
        {/* Result display */}
        <div className="min-h-[80px] flex flex-col items-center justify-center mb-4">
          {lastResult && lastResult.winType !== WinType.NONE && !showRespinUI ? (
            <div className="text-center animate-bounce">
              <div className="text-2xl font-bold text-green-400">
                🎉 {getWinTypeDisplay(lastResult.winType)} 🎉
              </div>
              <div className="text-xl text-white">+{Number(formatEther(lastResult.payout)).toLocaleString()} $HASH</div>
            </div>
          ) : isProcessing ? (
            <div className="text-center">
              <div className="text-xl text-purple-400 animate-pulse">
                🎰 {isRespinning || isRespinConfirming ? 'Respinning...' : 'Spinning...'}
              </div>
            </div>
          ) : lastResult && showRespinUI && respinInfo?.eligible ? (
            <div className="text-center space-y-3 w-full max-w-md">
              {lastResult.winType !== WinType.NONE && (
                <div className="text-green-400 font-bold">
                  +{Number(formatEther(lastResult.payout)).toLocaleString()} $HASH
                </div>
              )}
              
              {/* Respin UI */}
              <div className="border border-yellow-500/50 bg-yellow-500/10 p-3 rounded">
                <div className="text-sm text-yellow-400 mb-2 flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  <span>Lock & Respin available!</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Click reels to lock them, then respin the rest
                </p>
                
                {lockCount > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-400">
                      {lockCount} reel{lockCount > 1 ? 's' : ''} locked • Cost: <span className="text-yellow-400 font-bold">{Number(formatEther(respinCost || 0n)).toLocaleString()} $HASH</span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleRespin}
                    disabled={!canRespin || isProcessing}
                    className={`
                      px-6 py-2 font-bold border-2 transition-all flex items-center gap-2
                      ${canRespin && !isProcessing
                        ? 'bg-yellow-500 text-black border-yellow-400 hover:bg-yellow-400'
                        : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                      }
                    `}
                  >
                    <RotateCcw className="w-4 h-4" />
                    RESPIN
                  </button>
                  <button
                    onClick={() => {
                      setShowRespinUI(false)
                      setLockedReels([false, false, false])
                    }}
                    className="px-4 py-2 border border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white transition-colors"
                  >
                    SKIP
                  </button>
                </div>
              </div>
            </div>
          ) : lastResult && lastResult.winType === WinType.NONE ? (
            <div className="text-center text-gray-500">
              No win. Try again!
            </div>
          ) : null}
        </div>
        
        {/* Bet controls */}
        {isConnected && (
          <div className="space-y-4">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Balance: <span className="text-white">{Number(formatEther(balance)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> $HASH</span>
              <span>Tier: <span className="text-purple-400">{tierName || 'NONE'}</span></span>
            </div>
            
            {/* Bet Limits */}
            <div className="flex justify-between text-xs text-gray-500 border border-gray-800 px-3 py-2 bg-gray-900/50">
              <span>MIN: <span className="text-yellow-400">{Number(formatEther(minBet)).toLocaleString()}</span></span>
              <span className="text-gray-600">|</span>
              <span>MAX: <span className="text-green-400">{Number(formatEther(maxBet)).toLocaleString()}</span></span>
            </div>
            
            {/* Approval check */}
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
                className={`
                  w-36 py-3 font-bold border-2 transition-all duration-100 uppercase tracking-wider
                  ${!canSpin
                    ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed' 
                    : 'bg-purple-600 text-white border-purple-400 hover:bg-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                  }
                `}
              >
                {isProcessing ? 'SPINNING...' : 'SPIN'}
              </button>
            </div>
            
            {/* Quick bet buttons */}
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
                onClick={() => {
                  const max = balance < maxBet ? balance : maxBet
                  setBetAmount(formatEther(max))
                }}
                disabled={isProcessing}
                className="flex-1 py-1 text-xs border border-purple-700 text-purple-400 hover:border-purple-400 hover:text-white transition-colors"
              >
                MAX
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Payout Table & History */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-black border border-purple-500/30 p-4">
          <h3 className="text-sm font-bold text-purple-400 mb-3 uppercase">Payout Table</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(PAYOUTS).map(([key, { mult, desc }]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400">{desc}</span>
                <span className={`font-bold ${key === 'jackpot' ? 'text-yellow-400' : 'text-green-400'}`}>{mult}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-black border border-purple-500/30 p-4">
          <h3 className="text-sm font-bold text-purple-400 mb-3 uppercase">Recent Spins</h3>
          <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
            {onchainHistory.length === 0 ? (
              <div className="text-gray-600">No spins yet...</div>
            ) : (
              onchainHistory.map((spin, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="font-mono">
                    {spin.result.map(r => SYMBOLS[r]).join('')}
                  </span>
                  <span className={spin.payout > 0n ? 'text-green-400' : 'text-red-400'}>
                    {spin.payout > 0n ? `+${Number(formatEther(spin.payout)).toLocaleString()}` : '-'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 text-center text-sm">
        {[
          { label: 'TOTAL SPINS', val: gameStats ? gameStats.totalSpins.toString() : '—' },
          { label: 'WAGERED', val: gameStats ? `${(Number(formatEther(gameStats.totalWagered)) / 1000).toFixed(0)}K` : '—' },
          { label: 'PAID OUT', val: gameStats ? `${(Number(formatEther(gameStats.totalPaidOut)) / 1000).toFixed(0)}K` : '—' },
          { label: 'BURNED', val: gameStats ? `${(Number(formatEther(gameStats.totalBurned)) / 1000).toFixed(0)}K` : '—' },
        ].map(stat => (
          <div key={stat.label} className="bg-black border border-gray-800 p-3">
            <div className="text-gray-500 text-xs">{stat.label}</div>
            <div className="text-white font-bold">{stat.val}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
