import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useHashGame, GameMode, BetStatus } from '../hooks/useHashGame'
import { useHashToken } from '../hooks/useHashToken'
import { useHashJackpot } from '../hooks/useHashJackpot'
import { TokenApproval } from '../components/TokenApproval'
import { GetHashCTA } from '../components/GetHashCTA'
import { PendingBets } from '../components/PendingBets'

const GAME_MODES = {
  [GameMode.ONE_DIGIT]: { digits: 1, label: '1 DIGIT', chance: '6.25%' },
  [GameMode.TWO_DIGIT]: { digits: 2, label: '2 DIGITS', chance: '0.39%' },
  [GameMode.THREE_DIGIT]: { digits: 3, label: '3 DIGITS', chance: '0.024%' },
} as const

const HEX_CHARS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']

export function PlayPage() {
  const { isConnected, address } = useAccount()
  const { balance, hasGameApproval, refetchBalance } = useHashToken()
  const { 
    currentStreak, 
    pendingBet, 
    pendingBetId,
    lastResult,
    blockNumber,
    payouts,
    jackpotStreak,
    placeBet,
    resolveBet,
    isPlacingBet,
    isBetConfirming,
    isResolving,
    isResolveConfirming,
    clearResult,
    refetchStreak,
  } = useHashGame()
  const { currentPot } = useHashJackpot()

  const [mode, setMode] = useState<GameMode>(GameMode.ONE_DIGIT)
  const [selectedHex, setSelectedHex] = useState<string | null>(null)
  const [prediction2, setPrediction2] = useState('')
  const [prediction3, setPrediction3] = useState('')
  const [betAmount, setBetAmount] = useState('100')
  const [gameLog, setGameLog] = useState<string[]>(['> SYSTEM READY...', '> AWAITING INPUT...'])

  const modeConfig = GAME_MODES[mode]
  const payout = payouts[mode]

  // Add to log helper
  const addToLog = (msg: string) => {
    setGameLog(prev => [`> ${msg}`, ...prev].slice(0, 5))
  }

  // Log wallet connection
  useEffect(() => {
    if (isConnected && address) {
      addToLog(`WALLET CONNECTED: ${address.slice(0, 6)}...${address.slice(-4)}`)
    }
  }, [isConnected, address])

  // Log bet placement
  useEffect(() => {
    if (isBetConfirming) {
      addToLog(`TX BROADCAST... WAITING FOR CONFIRMATION...`)
    }
  }, [isBetConfirming])

  // Log bet confirmed
  useEffect(() => {
    if (pendingBet && pendingBet.status === BetStatus.PENDING) {
      addToLog(`BET PLACED! TARGET BLOCK: #${pendingBet.targetBlock.toString()}`)
    }
  }, [pendingBet?.targetBlock])

  // Log result
  useEffect(() => {
    if (lastResult) {
      if (lastResult.won) {
        addToLog(`WINNER! +${formatEther(lastResult.payout)} $HASH`)
        refetchBalance()
        refetchStreak()
      } else {
        addToLog(`RESULT: [${lastResult.result.toString(16).toUpperCase().padStart(modeConfig.digits, '0')}]. LOST.`)
      }
    }
  }, [lastResult])

  const getCurrentPrediction = (): number | null => {
    if (mode === GameMode.ONE_DIGIT && selectedHex) {
      return parseInt(selectedHex, 16)
    }
    if (mode === GameMode.TWO_DIGIT && prediction2.length === 2) {
      return parseInt(prediction2, 16)
    }
    if (mode === GameMode.THREE_DIGIT && prediction3.length === 3) {
      return parseInt(prediction3, 16)
    }
    return null
  }

  const getPredictionDisplay = (): string => {
    if (mode === GameMode.ONE_DIGIT && selectedHex) return selectedHex.toUpperCase()
    if (mode === GameMode.TWO_DIGIT && prediction2) return prediction2.toUpperCase().padStart(2, '0')
    if (mode === GameMode.THREE_DIGIT && prediction3) return prediction3.toUpperCase().padStart(3, '0')
    return '---'
  }

  const handleModeChange = (newMode: GameMode) => {
    setMode(newMode)
    setSelectedHex(null)
    setPrediction2('')
    setPrediction3('')
  }

  const handlePlaceBet = () => {
    const prediction = getCurrentPrediction()
    const amount = parseEther(betAmount)
    if (prediction === null || amount <= 0n) return
    
    clearResult()
    placeBet(mode, prediction, amount)
    addToLog(`PLACING BET: ${betAmount} $HASH ON [${getPredictionDisplay()}]`)
  }

  const handleResolve = () => {
    if (pendingBetId !== null) {
      addToLog(`RESOLVING BET...`)
      resolveBet(pendingBetId)
    }
  }

  const prediction = getCurrentPrediction()
  const betAmountBigInt = parseEther(betAmount || '0')
  const canBet = prediction !== null && 
    betAmountBigInt > 0n && 
    betAmountBigInt <= balance && 
    !pendingBet &&
    !isPlacingBet &&
    !isBetConfirming

  const isProcessing = isPlacingBet || isBetConfirming || isResolving || isResolveConfirming

  // Check if we can resolve (target block reached)
  const canResolve = pendingBet && 
    pendingBet.status === BetStatus.PENDING && 
    blockNumber >= pendingBet.targetBlock

  return (
    <main className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
      {/* LEFT: BETTING CONTROLS */}
      <div className="md:col-span-7 flex flex-col gap-6">
        
        <GetHashCTA />
        
        {/* MODE TABS */}
        <div className="flex text-sm border-b border-white/20">
          {[GameMode.ONE_DIGIT, GameMode.TWO_DIGIT, GameMode.THREE_DIGIT].map((m) => (
            <button 
              key={m}
              onClick={() => handleModeChange(m)}
              disabled={!!pendingBet}
              className={`px-4 py-2 transition-colors ${
                mode === m 
                  ? 'bg-white text-black font-bold border-t border-x border-white' 
                  : 'text-gray-500 hover:text-white border-t border-x border-transparent hover:border-white/20'
              } ${pendingBet ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {GAME_MODES[m].label}
              <span className="ml-2 text-xs opacity-60">x{payouts[m]}</span>
            </button>
          ))}
        </div>

        {/* PREDICTION INPUT */}
        <div className="bg-black border border-white p-4 relative">
          <div className="absolute top-0 left-2 -mt-2 bg-black px-2 text-xs text-gray-400">
            SELECT {modeConfig.digits} DIGIT{modeConfig.digits > 1 ? 'S' : ''}
          </div>
          
          {mode === GameMode.ONE_DIGIT ? (
            <div className="grid grid-cols-4 gap-3">
              {HEX_CHARS.map((char) => (
                <button
                  key={char}
                  onClick={() => setSelectedHex(char)}
                  disabled={isProcessing}
                  className={`
                    aspect-square flex items-center justify-center text-xl font-bold border relative transition-all duration-75
                    ${selectedHex === char 
                      ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-105 z-10' 
                      : 'bg-black text-white border-gray-700 hover:border-white'
                    }
                    ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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
                  placeholder={mode === GameMode.TWO_DIGIT ? '00-FF' : '000-FFF'}
                  maxLength={modeConfig.digits}
                  value={mode === GameMode.TWO_DIGIT ? prediction2 : prediction3}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase()
                    if (/^[0-9a-f]*$/.test(val)) {
                      mode === GameMode.TWO_DIGIT ? setPrediction2(val) : setPrediction3(val)
                    }
                  }}
                  disabled={isProcessing}
                  className="flex-1 bg-black border border-white py-4 px-4 font-mono text-2xl text-center uppercase tracking-[0.3em] focus:outline-none focus:shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                />
                <button
                  onClick={() => {
                    const rand = Array(modeConfig.digits).fill(0).map(() => 
                      HEX_CHARS[Math.floor(Math.random() * 16)]
                    ).join('')
                    mode === GameMode.TWO_DIGIT ? setPrediction2(rand) : setPrediction3(rand)
                  }}
                  disabled={isProcessing}
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
        {!pendingBet && isConnected && hasGameApproval && balance > 0n && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between text-xs text-gray-400 uppercase">
              <span>Your Balance: <span className="text-white">{Number(formatEther(balance)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> $HASH</span>
              <span>Win Chance: <span className="text-white">{modeConfig.chance}</span></span>
            </div>
            <div className="flex gap-4">
              <div className="relative flex-grow">
                <input 
                  type="number" 
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={isProcessing}
                  className="w-full bg-black border border-white py-3 pl-4 pr-20 font-mono text-lg focus:outline-none focus:ring-1 focus:ring-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$HASH</span>
              </div>
              <button 
                onClick={handlePlaceBet}
                disabled={!canBet}
                className={`
                  px-6 py-3 font-bold border transition-all duration-100 uppercase tracking-wider
                  ${!canBet 
                    ? 'bg-gray-900 text-gray-600 cursor-not-allowed border-gray-800' 
                    : 'bg-white text-black border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] active:translate-y-0.5'
                  }
                `}
              >
                {isPlacingBet ? 'CONFIRMING...' : isBetConfirming ? 'PROCESSING...' : 'PLACE BET'}
              </button>
            </div>
            <div className="flex gap-2">
              {[10, 50, 100, 500].map(amt => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt.toString())}
                  disabled={isProcessing}
                  className="flex-1 py-1 text-xs border border-gray-700 text-gray-500 hover:border-white hover:text-white transition-colors"
                >
                  {amt}
                </button>
              ))}
              <button
                onClick={() => setBetAmount(formatEther(balance))}
                disabled={isProcessing}
                className="flex-1 py-1 text-xs border border-gray-700 text-gray-500 hover:border-white hover:text-white transition-colors"
              >
                MAX
              </button>
            </div>
          </div>
        )}

        {/* Token Approval */}
        {isConnected && balance > 0n && !hasGameApproval && (
          <TokenApproval target="game">
            <div />
          </TokenApproval>
        )}

      </div>

      {/* RIGHT: STATUS & LOGS */}
      <div className="md:col-span-5 flex flex-col gap-4">
        
        {/* GAME STATUS SCREEN */}
        <div className="border border-white/50 bg-black min-h-[200px] p-1 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)50%,rgba(0,0,0,0.1)50%)] bg-[length:100%_4px] pointer-events-none z-20 opacity-50"></div>
          
          <div className="border border-white/20 h-full p-4 flex flex-col items-center justify-center relative min-h-[180px]">
            
            {/* IDLE STATE */}
            {!pendingBet && !lastResult && (
              <div className="text-center">
                <div className="text-4xl mb-2">🎲</div>
                <div className="text-sm text-gray-400 mb-1">PREDICTION</div>
                <div className="text-3xl font-bold tracking-wider">{getPredictionDisplay()}</div>
                <div className="mt-4 text-xs border border-gray-600 px-2 py-1 inline-block">
                  BLOCK #{blockNumber.toString()}
                </div>
              </div>
            )}

            {/* PENDING BET */}
            {pendingBet && pendingBet.status === BetStatus.PENDING && (
              <div className="w-full text-center">
                <div className="text-xs text-left mb-2 text-gray-500">WAITING FOR BLOCK...</div>
                <div className="text-2xl font-bold mb-2">
                  #{pendingBet.targetBlock.toString()}
                </div>
                <div className="text-sm text-gray-400 mb-4">
                  Current: #{blockNumber.toString()}
                </div>
                {canResolve ? (
                  <button
                    onClick={handleResolve}
                    disabled={isResolving || isResolveConfirming}
                    className="px-6 py-2 font-bold border border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-colors"
                  >
                    {isResolving || isResolveConfirming ? 'RESOLVING...' : 'REVEAL RESULT'}
                  </button>
                ) : (
                  <div className="flex justify-center gap-1">
                    <span className="w-2 h-4 bg-white animate-bounce"></span>
                    <span className="w-2 h-4 bg-white animate-bounce" style={{animationDelay: '75ms'}}></span>
                    <span className="w-2 h-4 bg-white animate-bounce" style={{animationDelay: '150ms'}}></span>
                  </div>
                )}
              </div>
            )}

            {/* RESULT */}
            {lastResult && (
              <div className="w-full text-center relative z-30">
                {lastResult.won ? (
                  <div>
                    <div className="text-4xl font-black mb-2 text-white" style={{textShadow: '2px 0 #fff, -2px 0 #333'}}>
                      WINNER
                    </div>
                    <div className="text-xl text-green-400">
                      +{Number(formatEther(lastResult.payout)).toLocaleString()} $HASH
                    </div>
                    <div className="mt-2 text-xs text-gray-400">BLOCK VALIDATED</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl font-black mb-2 text-gray-500">WASTED</div>
                    <div className="text-sm">RESULT: <span className="text-white">{lastResult.result.toString(16).toUpperCase().padStart(modeConfig.digits, '0')}</span></div>
                    <div className="text-sm text-gray-500">YOURS: {getPredictionDisplay()}</div>
                  </div>
                )}
                <button
                  onClick={clearResult}
                  className="mt-4 px-4 py-1 text-xs border border-gray-600 text-gray-400 hover:border-white hover:text-white"
                >
                  PLAY AGAIN
                </button>
              </div>
            )}
            
          </div>
        </div>

        {/* PENDING BETS */}
        <PendingBets />

        {/* STREAK & JACKPOT */}
        <div className="border border-yellow-500/30 bg-yellow-500/5 p-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-500">WIN STREAK</div>
              <div className="text-2xl font-bold">
                {currentStreak} / {jackpotStreak}
                {currentStreak > 0 && <span className="ml-2">🔥</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">JACKPOT</div>
              <div className="text-lg font-bold text-yellow-500">
                {Number(formatEther(currentPot)).toLocaleString(undefined, { maximumFractionDigits: 0 })} $HASH
              </div>
            </div>
          </div>
          {currentStreak >= jackpotStreak && (
            <div className="mt-2 text-center text-green-400 text-sm font-bold animate-pulse">
              🎉 JACKPOT ELIGIBLE! WIN NEXT BET TO CLAIM!
            </div>
          )}
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
            <div className="text-lg font-bold">x{payout}</div>
          </div>
          <div className="border border-white/20 p-2">
            <div className="text-gray-500">POTENTIAL WIN</div>
            <div className="text-lg font-bold text-green-400">
              {(Number(betAmount || 0) * payout).toLocaleString()} <span className="text-xs font-normal text-gray-400">$HASH</span>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
