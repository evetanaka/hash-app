import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useHashToken } from '../hooks/useHashToken'
import { useCyberSlots, WinType } from '../hooks/useCyberSlots'
import { useHashStaking } from '../hooks/useHashStaking'
import { Zap, Volume2, VolumeX } from 'lucide-react'

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
    spin,
    clearResult,
    isSpinning,
    isSpinConfirming,
    refetchJackpot,
  } = useCyberSlots()
  
  const [betAmount, setBetAmount] = useState('100')
  const [displayReels, setDisplayReels] = useState([0, 0, 0])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [spinHistory, setSpinHistory] = useState<Array<{ reels: number[]; win: bigint; type: number }>>([])
  const [spinInitiated, setSpinInitiated] = useState(false)
  
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
      
      // Add to history
      setSpinHistory(prev => [{
        reels: [...lastResult.result],
        win: lastResult.payout,
        type: lastResult.winType
      }, ...prev].slice(0, 10))
      
      refetchBalance()
      refetchJackpot()
    }
  }, [lastResult, refetchBalance, refetchJackpot])
  
  const handleSpin = useCallback(() => {
    if (spinInitiated || isSpinning || isSpinConfirming) return
    
    const amount = parseEther(betAmount || '0')
    if (amount < minBet || amount > maxBet || amount > balance) return
    
    setSpinInitiated(true) // Start animation immediately
    clearResult()
    spin(amount)
  }, [betAmount, balance, minBet, maxBet, spinInitiated, isSpinning, isSpinConfirming, clearResult, spin])
  
  const isProcessing = spinInitiated || isSpinning || isSpinConfirming
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
        
        {/* Reels */}
        <div className="flex justify-center gap-4 mb-6">
          {displayReels.map((symbol, i) => (
            <div 
              key={i}
              className={`
                w-24 h-24 md:w-32 md:h-32 flex-shrink-0
                bg-gray-900 border-2 border-purple-400/50 
                flex items-center justify-center text-5xl md:text-6xl
                transition-all duration-100
                ${isProcessing ? 'animate-pulse border-purple-400' : ''}
                ${lastResult && lastResult.winType !== WinType.NONE ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]' : ''}
              `}
            >
              {SYMBOLS[symbol]}
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
        <div className="h-20 flex items-center justify-center mb-4">
          {lastResult && lastResult.winType !== WinType.NONE ? (
            <div className="text-center animate-bounce">
              <div className="text-2xl font-bold text-green-400">
                🎉 {getWinTypeDisplay(lastResult.winType)} 🎉
              </div>
              <div className="text-xl text-white">+{Number(formatEther(lastResult.payout)).toLocaleString()} $HASH</div>
            </div>
          ) : isProcessing ? (
            <div className="text-center">
              <div className="text-xl text-purple-400 animate-pulse">
                🎰 Spinning...
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
            {spinHistory.length === 0 ? (
              <div className="text-gray-600">No spins yet...</div>
            ) : (
              spinHistory.map((spin, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="font-mono">
                    {spin.reels.map(r => SYMBOLS[r]).join('')}
                  </span>
                  <span className={spin.win > 0n ? 'text-green-400' : 'text-red-400'}>
                    {spin.win > 0n ? `+${Number(formatEther(spin.win)).toLocaleString()}` : '-'}
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
