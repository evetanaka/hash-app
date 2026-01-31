import { useState } from 'react'
import { GameMode, GAME_MODE_CONFIG } from '../types'
import { DigitPicker } from './DigitPicker'
import { BetForm } from './BetForm'
import { PendingBet } from './PendingBet'

export function Game() {
  const [mode, setMode] = useState<GameMode>(GameMode.ONE_DIGIT)
  const [prediction, setPrediction] = useState<number | null>(null)
  const [pendingBetId, setPendingBetId] = useState<bigint | null>(null)

  const modeConfig = GAME_MODE_CONFIG[mode]

  return (
    <div className="game-container">
      {/* Mode Selection */}
      <div className="mode-tabs">
        {Object.entries(GAME_MODE_CONFIG).map(([key, config]) => (
          <button
            key={key}
            className={`mode-tab ${mode === Number(key) ? 'active' : ''}`}
            onClick={() => {
              setMode(Number(key) as GameMode)
              setPrediction(null)
            }}
          >
            <span className="mode-name">{config.name}</span>
            <span className="mode-payout">x{config.basePayout}</span>
          </button>
        ))}
      </div>

      {pendingBetId ? (
        <PendingBet 
          betId={pendingBetId} 
          onComplete={() => setPendingBetId(null)} 
        />
      ) : (
        <>
          {/* Digit Picker */}
          <div className="picker-section">
            <h3>{modeConfig.description}</h3>
            <DigitPicker
              mode={mode}
              value={prediction}
              onChange={setPrediction}
            />
          </div>

          {/* Bet Form */}
          {prediction !== null && (
            <BetForm
              mode={mode}
              prediction={prediction}
              onBetPlaced={(betId) => setPendingBetId(betId)}
            />
          )}
        </>
      )}
    </div>
  )
}
