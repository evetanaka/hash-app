import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { Wallet } from 'lucide-react'
import { config } from './config/wagmi'

const queryClient = new QueryClient()

// Game modes config
const GAME_MODES = {
  ONE: { digits: 1, choices: 16, payout: 10, label: '1 DIGIT', chance: '6.25%' },
  TWO: { digits: 2, choices: 256, payout: 150, label: '2 DIGITS', chance: '0.39%' },
  THREE: { digits: 3, choices: 4096, payout: 2000, label: '3 DIGITS', chance: '0.024%' },
} as const

type GameMode = keyof typeof GAME_MODES

const HEX_CHARS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']

function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [showModal, setShowModal] = useState(false)

  const handleConnect = (_walletType: 'metamask' | 'keplr') => {
    const connector = connectors.find(c => c.id === 'injected')
    if (connector) {
      connect({ connector })
    }
    setShowModal(false)
  }

  if (isConnected) {
    return (
      <div 
        className="flex items-center gap-2 border border-white px-3 py-1 font-bold text-sm bg-black group hover:bg-white hover:text-black cursor-pointer transition-colors"
        onClick={() => disconnect()}
      >
        <Wallet size={14} />
        <span>{address?.slice(0, 4)}...{address?.slice(-4)}</span>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 border border-white px-3 py-1 font-bold text-sm bg-black hover:bg-white hover:text-black transition-colors"
      >
        <Wallet size={14} />
        <span>CONNECT</span>
      </button>

      {/* Wallet Selection Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 animate-fadeIn"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-[#0a0a0a] border border-white p-6 max-w-sm w-full mx-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold tracking-wider">CONNECT WALLET</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleConnect('metamask')}
                className="flex items-center gap-4 p-4 border border-gray-700 hover:border-white hover:bg-white/5 transition-all group"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-orange-500/20 rounded">
                  <span className="text-2xl">🦊</span>
                </div>
                <div className="text-left">
                  <div className="font-bold">MetaMask</div>
                  <div className="text-xs text-gray-500">Connect with MetaMask</div>
                </div>
              </button>

              <button
                onClick={() => handleConnect('keplr')}
                className="flex items-center gap-4 p-4 border border-gray-700 hover:border-white hover:bg-white/5 transition-all group"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-purple-500/20 rounded">
                  <span className="text-2xl">⚛️</span>
                </div>
                <div className="text-left">
                  <div className="font-bold">Keplr</div>
                  <div className="text-xs text-gray-500">Connect with Keplr</div>
                </div>
              </button>
            </div>

            <p className="text-[10px] text-gray-600 mt-6 text-center">
              By connecting, you agree to our Terms of Service
            </p>
          </div>
        </div>
      )}
    </>
  )
}

function GameContent() {
  const { address, isConnected } = useAccount()
  const { data: walletBalance } = useBalance({ address })
  
  const [mode, setMode] = useState<GameMode>('ONE')
  const [gameState, setGameState] = useState<'IDLE' | 'MINING' | 'RESULT'>('IDLE')
  const [selectedHex, setSelectedHex] = useState<string | null>(null)
  const [prediction2, setPrediction2] = useState('')
  const [prediction3, setPrediction3] = useState('')
  const [betAmount, setBetAmount] = useState('100')
  const [balance, setBalance] = useState(5000)
  const [jackpot, setJackpot] = useState(45230)
  const [lastHash, setLastHash] = useState('0x...')
  const [gameLog, setGameLog] = useState(['> SYSTEM READY...', '> AWAITING WALLET CONNECTION...'])
  const [winningHex, setWinningHex] = useState<string | null>(null)
  const [blockHeight, setBlockHeight] = useState(19847523)
  const [won, setWon] = useState(false)

  const modeConfig = GAME_MODES[mode]

  // Update balance from wallet
  useEffect(() => {
    if (walletBalance) {
      setBalance(Math.floor(parseFloat(formatEther(walletBalance.value))))
    }
  }, [walletBalance])

  // Jackpot ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setJackpot(prev => prev + Math.floor(Math.random() * 10))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Block height ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setBlockHeight(prev => prev + 1)
    }, 12000)
    return () => clearInterval(interval)
  }, [])

  // Log wallet connection
  useEffect(() => {
    if (isConnected && address) {
      addToLog(`WALLET CONNECTED: ${address.slice(0, 6)}...${address.slice(-4)}`)
    }
  }, [isConnected, address])

  const addToLog = (msg: string) => {
    setGameLog(prev => [`> ${msg}`, ...prev].slice(0, 5))
  }

  const getCurrentPrediction = (): string | null => {
    if (mode === 'ONE') return selectedHex
    if (mode === 'TWO') return prediction2.length === 2 ? prediction2 : null
    if (mode === 'THREE') return prediction3.length === 3 ? prediction3 : null
    return null
  }

  const getPredictionDisplay = (): string => {
    const pred = getCurrentPrediction()
    return pred ? pred.toUpperCase() : '---'
  }

  const handleModeChange = (newMode: GameMode) => {
    setMode(newMode)
    setSelectedHex(null)
    setPrediction2('')
    setPrediction3('')
  }

  const placeBet = () => {
    const prediction = getCurrentPrediction()
    const amount = parseInt(betAmount) || 0
    if (!prediction || amount > balance || amount <= 0 || gameState === 'MINING') return
    
    setBalance(prev => prev - amount)
    setGameState('MINING')
    setWinningHex(null)
    addToLog(`TX BROADCAST... BET: ${amount} ON [${prediction.toUpperCase()}]`)

    let miningTicks = 0
    const miningInterval = setInterval(() => {
      miningTicks++
      const randomChars = Array(modeConfig.digits).fill(0).map(() => 
        HEX_CHARS[Math.floor(Math.random() * 16)]
      ).join('')
      setLastHash(`MINING... ${randomChars.toUpperCase()}${Math.random().toString(16).substr(2, 10)}...`)
      
      if (miningTicks > 20) {
        clearInterval(miningInterval)
        resolveGame(prediction, amount)
      }
    }, 100)
  }

  const resolveGame = (prediction: string, amount: number) => {
    const resultChars = Array(modeConfig.digits).fill(0).map(() => 
      HEX_CHARS[Math.floor(Math.random() * 16)]
    ).join('')
    const generatedHash = `0x${Math.random().toString(16).substr(2, 64 - modeConfig.digits)}${resultChars}`
    
    setLastHash(generatedHash)
    setWinningHex(resultChars)
    setGameState('RESULT')

    const isWin = resultChars === prediction
    setWon(isWin)

    if (isWin) {
      const winAmount = amount * modeConfig.payout
      setBalance(prev => prev + winAmount)
      addToLog(`BLOCK CONFIRMED. WINNER! +${winAmount} $HASH`)
    } else {
      addToLog(`BLOCK CONFIRMED. RESULT: [${resultChars.toUpperCase()}]. LOST.`)
    }

    setTimeout(() => {
      setGameState('IDLE')
      setWon(false)
    }, 4000)
  }

  const prediction = getCurrentPrediction()
  const canBet = prediction && parseInt(betAmount) > 0 && parseInt(betAmount) <= balance && gameState !== 'MINING'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-white selection:text-black overflow-x-hidden relative">
      {/* CRT Scanline Overlay - subtle */}
      <div className="pointer-events-none fixed inset-0 z-50 w-full h-full opacity-[0.03]" 
           style={{
             background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
             backgroundSize: '100% 2px'
           }} 
      />

      <div className="relative z-10 container mx-auto max-w-4xl p-4 flex flex-col gap-6">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-white/20 pb-6">
          <div className="whitespace-pre text-xs md:text-sm leading-none tracking-tighter opacity-90 select-none">
{`██╗  ██╗ █████╗ ███████╗██╗  ██╗
██║  ██║██╔══██╗██╔════╝██║  ██║
███████║███████║███████╗███████║
██╔══██║██╔══██║╚════██║██╔══██║
██║  ██║██║  ██║███████║██║  ██║
╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝`}
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col items-end gap-2 w-full md:w-auto">
            <nav className="flex gap-4 text-sm">
              <button className="bg-white text-black px-1 font-bold">[PLAY]</button>
              <button className="text-gray-600 px-1 cursor-not-allowed" title="Coming soon">[STAKE] <span className="text-[10px]">soon</span></button>
              <button className="text-gray-600 px-1 cursor-not-allowed" title="Coming soon">[REF] <span className="text-[10px]">soon</span></button>
              <button className="text-gray-600 px-1 cursor-not-allowed" title="Coming soon">[HISTORY] <span className="text-[10px]">soon</span></button>
            </nav>
            <ConnectWallet />
          </div>
        </header>

        {/* JACKPOT BANNER */}
        <div className="w-full overflow-hidden border-y border-white/30 py-2 bg-white/5">
          <div className="animate-marquee whitespace-nowrap font-bold tracking-widest text-sm md:text-base">
            ░░░ JACKPOT: {jackpot.toLocaleString()} $HASH ░░░ 5 WINS TO CLAIM ░░░ BLOCK #{blockHeight} ░░░
          </div>
        </div>

        {/* MAIN GAME AREA - 2 COLUMNS */}
        <main className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
          
          {/* LEFT: BETTING CONTROLS */}
          <div className="md:col-span-7 flex flex-col gap-6">
            
            {/* MODE TABS */}
            <div className="flex text-sm border-b border-white/20">
              {(Object.keys(GAME_MODES) as GameMode[]).map((m) => (
                <button 
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={`px-4 py-2 transition-colors ${
                    mode === m 
                      ? 'bg-white text-black font-bold border-t border-x border-white' 
                      : 'text-gray-500 hover:text-white border-t border-x border-transparent hover:border-white/20'
                  }`}
                >
                  {GAME_MODES[m].label}
                  <span className="ml-2 text-xs opacity-60">x{GAME_MODES[m].payout}</span>
                </button>
              ))}
            </div>

            {/* PREDICTION INPUT */}
            <div className="bg-black border border-white p-4 relative">
              <div className="absolute top-0 left-2 -mt-2 bg-black px-2 text-xs text-gray-400">
                SELECT {modeConfig.digits} DIGIT{modeConfig.digits > 1 ? 'S' : ''}
              </div>
              
              {mode === 'ONE' ? (
                <div className="grid grid-cols-4 gap-3">
                  {HEX_CHARS.map((char) => (
                    <button
                      key={char}
                      onClick={() => setSelectedHex(char)}
                      disabled={gameState === 'MINING'}
                      className={`
                        aspect-square flex items-center justify-center text-xl font-bold border relative transition-all duration-75
                        ${selectedHex === char 
                          ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-105 z-10' 
                          : 'bg-black text-white border-gray-700 hover:border-white'
                        }
                        ${gameState === 'MINING' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {char.toUpperCase()}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4 items-center">
                    <input
                      type="text"
                      placeholder={mode === 'TWO' ? '00-FF' : '000-FFF'}
                      maxLength={modeConfig.digits}
                      value={mode === 'TWO' ? prediction2 : prediction3}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase()
                        if (/^[0-9a-f]*$/.test(val)) {
                          mode === 'TWO' ? setPrediction2(val) : setPrediction3(val)
                        }
                      }}
                      disabled={gameState === 'MINING'}
                      className="flex-1 bg-black border border-white py-4 px-4 font-mono text-2xl text-center uppercase tracking-[0.3em] focus:outline-none focus:shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    />
                    <button
                      onClick={() => {
                        const rand = Array(modeConfig.digits).fill(0).map(() => 
                          HEX_CHARS[Math.floor(Math.random() * 16)]
                        ).join('')
                        mode === 'TWO' ? setPrediction2(rand) : setPrediction3(rand)
                      }}
                      disabled={gameState === 'MINING'}
                      className="px-4 py-4 border border-gray-600 text-gray-400 hover:border-white hover:text-white transition-colors"
                    >
                      🎲
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    Enter {modeConfig.digits} hex digits (0-9, a-f) or click 🎲 for random
                  </div>
                </div>
              )}
            </div>

            {/* BET INPUT & ACTION */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-xs text-gray-400 uppercase">
                <span>Your Balance: <span className="text-white">{balance.toLocaleString()}</span> $HASH</span>
                <span>Win Chance: <span className="text-white">{modeConfig.chance}</span></span>
              </div>
              <div className="flex gap-4">
                <div className="relative flex-grow">
                  <input 
                    type="number" 
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={gameState === 'MINING'}
                    className="w-full bg-black border border-white py-3 pl-4 pr-20 font-mono text-lg focus:outline-none focus:ring-1 focus:ring-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$HASH</span>
                </div>
                <button 
                  onClick={placeBet}
                  disabled={!canBet}
                  className={`
                    px-6 py-3 font-bold border transition-all duration-100 uppercase tracking-wider
                    ${!canBet 
                      ? 'bg-gray-900 text-gray-600 cursor-not-allowed border-gray-800' 
                      : 'bg-white text-black border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] active:translate-y-0.5'
                    }
                  `}
                >
                  {gameState === 'MINING' ? 'MINING...' : 'PLACE BET'}
                </button>
              </div>
              <div className="flex gap-2">
                {[10, 50, 100, 500].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setBetAmount(amt.toString())}
                    disabled={gameState === 'MINING'}
                    className="flex-1 py-1 text-xs border border-gray-700 text-gray-500 hover:border-white hover:text-white transition-colors"
                  >
                    {amt}
                  </button>
                ))}
                <button
                  onClick={() => setBetAmount(balance.toString())}
                  disabled={gameState === 'MINING'}
                  className="flex-1 py-1 text-xs border border-gray-700 text-gray-500 hover:border-white hover:text-white transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT: STATUS & LOGS */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* GAME STATUS SCREEN */}
            <div className="border border-white/50 bg-black min-h-[200px] p-1 flex flex-col relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)50%,rgba(0,0,0,0.1)50%)] bg-[length:100%_4px] pointer-events-none z-20 opacity-50"></div>
              
              <div className="border border-white/20 h-full p-4 flex flex-col items-center justify-center relative min-h-[180px]">
                
                {gameState === 'IDLE' && (
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎲</div>
                    <div className="text-sm text-gray-400 mb-1">PREDICTION</div>
                    <div className="text-3xl font-bold tracking-wider">{getPredictionDisplay()}</div>
                    <div className="mt-4 text-xs border border-gray-600 px-2 py-1 inline-block">
                      BLOCK #{blockHeight}
                    </div>
                  </div>
                )}

                {gameState === 'MINING' && (
                  <div className="w-full text-center">
                    <div className="text-xs text-left mb-2 text-gray-500">HASHING...</div>
                    <div className="font-mono text-lg break-all leading-relaxed opacity-80">
                      {lastHash.substring(0, 20)}
                      <br/>
                      {lastHash.substring(20, 40)}
                    </div>
                    <div className="mt-4 flex justify-center gap-1">
                      <span className="w-2 h-4 bg-white animate-bounce"></span>
                      <span className="w-2 h-4 bg-white animate-bounce" style={{animationDelay: '75ms'}}></span>
                      <span className="w-2 h-4 bg-white animate-bounce" style={{animationDelay: '150ms'}}></span>
                    </div>
                  </div>
                )}

                {gameState === 'RESULT' && winningHex && (
                  <div className="w-full text-center relative z-30">
                    {won ? (
                      <div>
                        <div className="text-4xl font-black mb-2 text-white" style={{textShadow: '2px 0 #fff, -2px 0 #333'}}>
                          WINNER
                        </div>
                        <div className="text-xl text-green-400">
                          +{((parseInt(betAmount) || 0) * modeConfig.payout).toLocaleString()} $HASH
                        </div>
                        <div className="mt-2 text-xs text-gray-400">BLOCK VALIDATED</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl font-black mb-2 text-gray-500">WASTED</div>
                        <div className="text-sm">RESULT: <span className="text-white">{winningHex.toUpperCase()}</span></div>
                        <div className="text-sm text-gray-500">YOURS: {getCurrentPrediction()?.toUpperCase()}</div>
                      </div>
                    )}
                  </div>
                )}
                
              </div>
            </div>

            {/* CONSOLE LOG */}
            <div className="bg-black border border-white/30 p-3 font-mono text-xs h-36 overflow-hidden flex flex-col justify-end">
              <div className="text-gray-500 mb-2 border-b border-gray-800 pb-1">TERMINAL_OUTPUT_V1.0</div>
              {gameLog.map((log, i) => (
                <div key={i} className={`mb-1 ${i === 0 ? 'text-white' : 'text-gray-500'}`}>
                  {log}
                </div>
              ))}
              <div className="animate-pulse">_</div>
            </div>

            {/* LIVE STATS */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="border border-white/20 p-2">
                <div className="text-gray-500">MULTIPLIER</div>
                <div className="text-lg font-bold">x{modeConfig.payout}</div>
              </div>
              <div className="border border-white/20 p-2">
                <div className="text-gray-500">POTENTIAL WIN</div>
                <div className="text-lg font-bold text-green-400">
                  {((parseInt(betAmount) || 0) * modeConfig.payout).toLocaleString()} <span className="text-xs font-normal text-gray-400">$HASH</span>
                </div>
              </div>
            </div>

          </div>
        </main>

        {/* FOOTER */}
        <footer className="mt-8 border-t border-white/20 pt-6 pb-10 text-center flex flex-col items-center gap-4">
          <p className="text-xl tracking-[0.2em] font-bold">PREDICT THE BLOCK. WIN THE HASH.</p>
          <div className="flex gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-white hover:underline">[DOCS]</a>
            <a href="#" className="hover:text-white hover:underline">[TWITTER]</a>
            <a href="#" className="hover:text-white hover:underline">[DISCORD]</a>
          </div>
          <p className="text-[10px] text-gray-700 mt-4 max-w-md">
            DISCLAIMER: GAMBLING WITH $HASH IS UNREGULATED. PLAY RESPONSIBLY.
          </p>
        </footer>

      </div>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <GameContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
