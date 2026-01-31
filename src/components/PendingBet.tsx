import { useEffect, useState } from 'react'

interface PendingBetProps {
  betId: bigint
  onComplete: () => void
}

export function PendingBet({ betId, onComplete }: PendingBetProps) {
  const [countdown, setCountdown] = useState(4)
  const [result, setResult] = useState<'pending' | 'won' | 'lost'>('pending')
  const [blockHash, setBlockHash] = useState<string | null>(null)

  useEffect(() => {
    // Countdown simulation
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          // Simulate result
          const won = Math.random() < 0.0625 // 6.25% chance
          setResult(won ? 'won' : 'lost')
          setBlockHash('0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''))
          return 0
        }
        return c - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (result === 'pending') {
    return (
      <div className="pending-bet">
        <h2>🎲 BET PLACED</h2>
        <p>Waiting for block...</p>
        <div className="countdown">{countdown}</div>
        <p className="bet-id">Bet #{betId.toString()}</p>
      </div>
    )
  }

  return (
    <div className={`bet-result ${result}`}>
      {result === 'won' ? (
        <>
          <h2>🎉 YOU WON! 🎉</h2>
          <div className="block-hash">
            <p>Block hash:</p>
            <code>{blockHash?.slice(0, 20)}...{blockHash?.slice(-8)}</code>
          </div>
          <div className="actions">
            <button className="cash-out" onClick={onComplete}>
              💰 CASH OUT
            </button>
            <button className="ride" onClick={onComplete}>
              🚀 RIDE x20
            </button>
          </div>
        </>
      ) : (
        <>
          <h2>😔 NOT THIS TIME</h2>
          <div className="block-hash">
            <p>Block hash:</p>
            <code>{blockHash?.slice(0, 20)}...{blockHash?.slice(-8)}</code>
          </div>
          <button className="try-again" onClick={onComplete}>
            🎲 TRY AGAIN
          </button>
        </>
      )}
    </div>
  )
}
