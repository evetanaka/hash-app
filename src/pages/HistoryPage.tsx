import { useState } from 'react'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { useBetHistory, type BetEvent } from '../hooks/useBetHistory'
import { GameMode } from '../hooks/useHashGame'

type FilterType = 'all' | 'wins' | 'losses' | 'pending'

const MODE_LABELS: Record<GameMode, string> = {
  [GameMode.ONE_DIGIT]: '1D',
  [GameMode.TWO_DIGIT]: '2D',
  [GameMode.THREE_DIGIT]: '3D',
}

function formatPrediction(prediction: number, mode: GameMode): string {
  const digits = mode === GameMode.ONE_DIGIT ? 1 : mode === GameMode.TWO_DIGIT ? 2 : 3
  return prediction.toString(16).toUpperCase().padStart(digits, '0')
}

function BetRow({ bet }: { bet: BetEvent }) {
  const etherscanUrl = `https://sepolia.etherscan.io/tx/${bet.txHash}`
  
  return (
    <tr className="border-b border-white/10 hover:bg-white/5">
      <td className="py-3 px-2">
        <span className="font-mono text-xs">{MODE_LABELS[bet.mode]}</span>
      </td>
      <td className="py-3 px-2">
        <span className="font-bold">{formatPrediction(bet.prediction, bet.mode)}</span>
      </td>
      <td className="py-3 px-2 text-right">
        {Number(formatEther(bet.amount)).toLocaleString()} $HASH
      </td>
      <td className="py-3 px-2 text-center">
        {bet.won === undefined ? (
          <span className="text-yellow-500">⏳</span>
        ) : bet.won ? (
          <span className="text-green-500">✓</span>
        ) : (
          <span className="text-red-500">✗</span>
        )}
      </td>
      <td className="py-3 px-2 text-right">
        {bet.result !== undefined ? (
          <span className={bet.won ? 'text-green-400' : 'text-gray-500'}>
            {formatPrediction(bet.result, bet.mode)}
          </span>
        ) : (
          <span className="text-gray-600">---</span>
        )}
      </td>
      <td className="py-3 px-2 text-right">
        {bet.payout !== undefined && bet.won ? (
          <span className="text-green-400 font-bold">
            +{Number(formatEther(bet.payout)).toLocaleString()}
          </span>
        ) : bet.won === false ? (
          <span className="text-red-400">
            -{Number(formatEther(bet.amount)).toLocaleString()}
          </span>
        ) : (
          <span className="text-gray-600">---</span>
        )}
      </td>
      <td className="py-3 px-2 text-right">
        <a
          href={etherscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-xs"
        >
          {bet.txHash.slice(0, 6)}...
        </a>
      </td>
    </tr>
  )
}

export function HistoryPage() {
  const { isConnected } = useAccount()
  const { bets, wins, losses, pending, stats, isLoading, error, refetch } = useBetHistory(100)
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredBets = filter === 'all' ? bets : 
    filter === 'wins' ? wins :
    filter === 'losses' ? losses :
    pending

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">📜</div>
        <h2 className="text-2xl font-bold mb-2">CONNECT WALLET</h2>
        <p className="text-gray-500">Connect your wallet to view your bet history</p>
      </div>
    )
  }

  return (
    <main className="max-w-4xl mx-auto mt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">BET HISTORY</h1>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="px-4 py-2 text-sm border border-gray-600 text-gray-400 hover:border-white hover:text-white disabled:opacity-50"
        >
          {isLoading ? 'LOADING...' : 'REFRESH'}
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="border border-white/20 p-3 text-center">
          <div className="text-xs text-gray-500">TOTAL BETS</div>
          <div className="text-xl font-bold">{stats.totalBets}</div>
        </div>
        <div className="border border-green-500/30 p-3 text-center">
          <div className="text-xs text-gray-500">WINS</div>
          <div className="text-xl font-bold text-green-400">{stats.winCount}</div>
        </div>
        <div className="border border-red-500/30 p-3 text-center">
          <div className="text-xs text-gray-500">LOSSES</div>
          <div className="text-xl font-bold text-red-400">{stats.lossCount}</div>
        </div>
        <div className="border border-white/20 p-3 text-center">
          <div className="text-xs text-gray-500">WIN RATE</div>
          <div className="text-xl font-bold">{stats.winRate.toFixed(1)}%</div>
        </div>
        <div className={`border p-3 text-center ${stats.netProfit >= 0n ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <div className="text-xs text-gray-500">NET P/L</div>
          <div className={`text-xl font-bold ${stats.netProfit >= 0n ? 'text-green-400' : 'text-red-400'}`}>
            {stats.netProfit >= 0n ? '+' : ''}{Number(formatEther(stats.netProfit)).toLocaleString()}
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2 mb-4 border-b border-white/20">
        {(['all', 'wins', 'losses', 'pending'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-bold transition-colors ${
              filter === f
                ? 'bg-white text-black'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            {f.toUpperCase()}
            <span className="ml-2 text-xs opacity-60">
              ({f === 'all' ? bets.length : 
                f === 'wins' ? wins.length : 
                f === 'losses' ? losses.length : 
                pending.length})
            </span>
          </button>
        ))}
      </div>

      {/* ERROR */}
      {error && (
        <div className="border border-red-500/50 bg-red-500/10 p-4 mb-4 text-sm text-red-400">
          Error loading history: {error.message}
        </div>
      )}

      {/* TABLE */}
      {filteredBets.length > 0 ? (
        <div className="border border-white/20 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/20 bg-white/5">
              <tr>
                <th className="py-2 px-2 text-left text-xs text-gray-500">MODE</th>
                <th className="py-2 px-2 text-left text-xs text-gray-500">PICK</th>
                <th className="py-2 px-2 text-right text-xs text-gray-500">AMOUNT</th>
                <th className="py-2 px-2 text-center text-xs text-gray-500">W/L</th>
                <th className="py-2 px-2 text-right text-xs text-gray-500">RESULT</th>
                <th className="py-2 px-2 text-right text-xs text-gray-500">PAYOUT</th>
                <th className="py-2 px-2 text-right text-xs text-gray-500">TX</th>
              </tr>
            </thead>
            <tbody>
              {filteredBets.map((bet) => (
                <BetRow key={bet.txHash + bet.betId.toString()} bet={bet} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 border border-white/10">
          <div className="text-4xl mb-4">📭</div>
          <p>No {filter === 'all' ? 'bets' : filter} found</p>
          {filter === 'all' && <p className="text-xs mt-2">Place your first bet to get started!</p>}
        </div>
      )}

      {/* LOADING */}
      {isLoading && (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-white/20 border-t-white rounded-full mb-2"></div>
          <p>Loading history...</p>
        </div>
      )}
    </main>
  )
}
