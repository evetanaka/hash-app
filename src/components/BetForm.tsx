import { useState } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { GameMode, GAME_MODE_CONFIG } from '../types'
import { CONTRACTS } from '../config/wagmi'

interface BetFormProps {
  mode: GameMode
  prediction: number
  onBetPlaced: (betId: bigint) => void
}

const QUICK_AMOUNTS = [10, 50, 100, 500]

export function BetForm({ mode, prediction, onBetPlaced }: BetFormProps) {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({
    address,
    token: CONTRACTS.hashToken,
  })

  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const modeConfig = GAME_MODE_CONFIG[mode]
  const amountBigInt = amount ? parseEther(amount) : 0n
  const potentialWin = amountBigInt * BigInt(modeConfig.basePayout)

  const handlePlaceBet = async () => {
    if (!isConnected || !amount) return
    
    setIsLoading(true)
    try {
      // TODO: Implement actual contract call
      // const tx = await writeContract({...})
      // onBetPlaced(betId)
      console.log('Placing bet:', { mode, prediction, amount })
      
      // Simulated for now
      setTimeout(() => {
        onBetPlaced(BigInt(Date.now()))
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to place bet:', error)
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="bet-form">
        <p>Connect your wallet to play</p>
      </div>
    )
  }

  return (
    <div className="bet-form">
      <div className="prediction-display">
        Your pick: <span className="highlight">{prediction.toString(16).padStart(mode === GameMode.ONE_DIGIT ? 1 : mode === GameMode.TWO_DIGIT ? 2 : 3, '0')}</span>
      </div>

      <div className="amount-input">
        <label>Bet amount (in $HASH)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min="0"
        />
        <div className="quick-amounts">
          {QUICK_AMOUNTS.map((qty) => (
            <button key={qty} onClick={() => setAmount(qty.toString())}>
              {qty}
            </button>
          ))}
          <button onClick={() => balance && setAmount(formatEther(balance.value))}>
            MAX
          </button>
        </div>
      </div>

      <div className="potential-win">
        <span>Potential win:</span>
        <span className="win-amount">{formatEther(potentialWin)} $HASH</span>
        <span className="multiplier">(x{modeConfig.basePayout})</span>
      </div>

      <button
        className="place-bet-btn"
        onClick={handlePlaceBet}
        disabled={isLoading || !amount || amountBigInt === 0n}
      >
        {isLoading ? 'Placing bet...' : '🎲 PLACE BET'}
      </button>

      <p className="target-block">
        Target block: #{/* TODO: current block + 2 */}
      </p>
    </div>
  )
}
