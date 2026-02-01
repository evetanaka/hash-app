import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useHashToken } from '../hooks/useHashToken'
import { Zap, Volume2, VolumeX } from 'lucide-react'

// Cyber-themed symbols (hex-inspired)
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '⭐', '7️⃣', '💀', '👑', '🚀', '⚡', '🎰', '💜', '🔮', '💀']
const SYMBOL_NAMES = ['CHERRY', 'LEMON', 'ORANGE', 'GRAPE', 'BELL', 'DIAMOND', 'STAR', 'SEVEN', 'SKULL', 'CROWN', 'ROCKET', 'BOLT', 'SLOT', 'NEON', 'CYBER', 'JACKPOT']

// Payout info
const PAYOUTS = {
  threeJackpot: { mult: '100x', desc: '💀💀💀 JACKPOT' },
  threeOfKind: { mult: '5x', desc: 'Three of a kind' },
  sequential: { mult: '3x', desc: 'Sequential (e.g. 3-4-5)' },
  twoOfKind: { mult: '1.5x', desc: 'Two of a kind' },
}

export function SlotsPage() {
  const { isConnected } = useAccount()
  const { balance, refetchBalance } = useHashToken()
  
  const [betAmount, setBetAmount] = useState('100')
  const [isSpinning, setIsSpinning] = useState(false)
  const [displayReels, setDisplayReels] = useState([0, 0, 0])
  const [lastWin, setLastWin] = useState<{ amount: string; type: string } | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [spinHistory, setSpinHistory] = useState<Array<{ reels: number[]; win: number; type: string }>>([])
  
  // Simulated jackpot pool (will be from contract)
  const [jackpotPool, setJackpotPool] = useState(125000)
  
  // Animation effect for reels
  useEffect(() => {
    if (isSpinning) {
      const interval = setInterval(() => {
        setDisplayReels([
          Math.floor(Math.random() * 16),
          Math.floor(Math.random() * 16),
          Math.floor(Math.random() * 16),
        ])
      }, 50)
      
      return () => clearInterval(interval)
    }
  }, [isSpinning])
  
  const handleSpin = useCallback(async () => {
    if (isSpinning) return
    
    const amount = parseEther(betAmount || '0')
    if (amount <= 0n || amount > balance) return
    
    setIsSpinning(true)
    setLastWin(null)
    
    // Simulate spin (will be replaced with contract call)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Generate random result
    const result = [
      Math.floor(Math.random() * 16),
      Math.floor(Math.random() * 16),
      Math.floor(Math.random() * 16),
    ]
    
    setDisplayReels(result)
    setIsSpinning(false)
    
    // Calculate win
    const win = calculateWin(result, Number(betAmount))
    if (win.amount > 0) {
      setLastWin({ amount: win.amount.toLocaleString(), type: win.type })
    }
    
    // Add to history
    setSpinHistory(prev => [{ reels: result, win: win.amount, type: win.type }, ...prev].slice(0, 10))
    
    // Update jackpot pool
    setJackpotPool(prev => prev + Number(betAmount) * 0.02)
    
    refetchBalance()
  }, [betAmount, balance, isSpinning, refetchBalance])
  
  const calculateWin = (result: number[], bet: number): { amount: number; type: string } => {
    // Three of a kind
    if (result[0] === result[1] && result[1] === result[2]) {
      if (result[0] === 15) {
        return { amount: bet * 100 + jackpotPool, type: 'JACKPOT' }
      }
      return { amount: bet * 5, type: 'THREE_OF_KIND' }
    }
    
    // Sequential
    const sorted = [...result].sort((a, b) => a - b)
    if (sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1) {
      return { amount: bet * 3, type: 'SEQUENTIAL' }
    }
    
    // Two of a kind
    if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
      return { amount: bet * 1.5, type: 'TWO_OF_KIND' }
    }
    
    return { amount: 0, type: 'NONE' }
  }

  return (
    <main className="max-w-4xl mx-auto mt-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
            <Zap className="text-purple-400" /> CYBER_SLOTS
          </h1>
          <p className="text-gray-500 text-sm">HIGH VOLATILITY. NEON CRASH.</p>
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
          {jackpotPool.toLocaleString(undefined, { maximumFractionDigits: 0 })} $HASH
        </div>
        <div className="text-xs text-gray-500">Hit 💀💀💀 to win!</div>
      </div>
      
      {/* Slot Machine */}
      <div className="bg-black border-2 border-purple-500/50 p-6 mb-6 relative overflow-hidden">
        {/* Neon glow effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />
        
        {/* Reels */}
        <div className="flex justify-center gap-4 mb-6">
          {displayReels.map((symbol, i) => (
            <div 
              key={i}
              className={`
                w-24 h-24 md:w-32 md:h-32 
                bg-gray-900 border-2 border-purple-400/50 
                flex items-center justify-center text-5xl md:text-6xl
                transition-all duration-100
                ${isSpinning ? 'animate-pulse border-purple-400' : ''}
                ${lastWin && lastWin.type !== 'NONE' ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]' : ''}
              `}
            >
              {SYMBOLS[symbol]}
            </div>
          ))}
        </div>
        
        {/* Symbol name display */}
        <div className="flex justify-center gap-4 mb-6">
          {displayReels.map((symbol, i) => (
            <div key={i} className="w-24 md:w-32 text-center text-xs text-gray-500 font-mono">
              {SYMBOL_NAMES[symbol]}
            </div>
          ))}
        </div>
        
        {/* Win display */}
        {lastWin && lastWin.type !== 'NONE' && (
          <div className="text-center mb-4 animate-bounce">
            <div className="text-2xl font-bold text-green-400">
              🎉 {lastWin.type === 'JACKPOT' ? 'JACKPOT!!!' : 'WINNER!'} 🎉
            </div>
            <div className="text-xl text-white">+{lastWin.amount} $HASH</div>
          </div>
        )}
        
        {/* Bet controls */}
        {isConnected && (
          <div className="space-y-4">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Balance: <span className="text-white">{Number(formatEther(balance)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> $HASH</span>
              <span>Min: 10 | Max: 10,000</span>
            </div>
            
            <div className="flex gap-4">
              <div className="relative flex-grow">
                <input 
                  type="number" 
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={isSpinning}
                  className="w-full bg-black border border-purple-500/50 py-3 pl-4 pr-20 font-mono text-lg focus:outline-none focus:border-purple-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$HASH</span>
              </div>
              <button 
                onClick={handleSpin}
                disabled={isSpinning || parseEther(betAmount || '0') > balance}
                className={`
                  px-8 py-3 font-bold border-2 transition-all duration-100 uppercase tracking-wider
                  ${isSpinning 
                    ? 'bg-purple-900 text-purple-400 border-purple-700 cursor-wait animate-pulse' 
                    : 'bg-purple-600 text-white border-purple-400 hover:bg-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                  }
                `}
              >
                {isSpinning ? 'SPINNING...' : 'SPIN'}
              </button>
            </div>
            
            {/* Quick bet buttons */}
            <div className="flex gap-2">
              {[10, 50, 100, 500, 1000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt.toString())}
                  disabled={isSpinning}
                  className="flex-1 py-1 text-xs border border-purple-700 text-purple-400 hover:border-purple-400 hover:text-white transition-colors"
                >
                  {amt}
                </button>
              ))}
              <button
                onClick={() => setBetAmount(Math.min(Number(formatEther(balance)), 10000).toString())}
                disabled={isSpinning}
                className="flex-1 py-1 text-xs border border-purple-700 text-purple-400 hover:border-purple-400 hover:text-white transition-colors"
              >
                MAX
              </button>
            </div>
          </div>
        )}
        
        {/* Token Approval will be added when contract is deployed */}
      </div>
      
      {/* Payout Table */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-black border border-purple-500/30 p-4">
          <h3 className="text-sm font-bold text-purple-400 mb-3 uppercase">Payout Table</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(PAYOUTS).map(([key, { mult, desc }]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400">{desc}</span>
                <span className="text-green-400 font-bold">{mult}</span>
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
                  <span className={spin.win > 0 ? 'text-green-400' : 'text-red-400'}>
                    {spin.win > 0 ? `+${spin.win}` : '-'}
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
          { label: 'TOTAL SPINS', val: '12,403' },
          { label: 'TOTAL WAGERED', val: '2.4M' },
          { label: 'TOTAL PAID', val: '2.1M' },
          { label: 'BURNED', val: '124K' },
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
