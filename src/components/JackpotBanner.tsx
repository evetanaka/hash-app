import { useHashJackpot } from '../hooks/useHashJackpot'
import { useGlobalStats } from '../hooks/useGlobalStats'
import { formatEther } from 'viem'

export function JackpotBanner() {
  const { currentPot, stats: jackpotStats } = useHashJackpot()
  const { totalBets, lastWinFormatted, blockNumber } = useGlobalStats()

  const formattedPot = Number(formatEther(currentPot)).toLocaleString(undefined, { maximumFractionDigits: 0 })

  return (
    <div className="w-full overflow-hidden border-y border-white/30 py-2 bg-white/5">
      <div className="animate-marquee whitespace-nowrap font-bold tracking-widest text-sm md:text-base">
        ░░░ JACKPOT: {formattedPot} $HASH ░░░ 5 WINS TO CLAIM ░░░ BLOCK #{blockNumber?.toString() || '...'} ░░░ 
        {jackpotStats && ` STREAK WINS: ${jackpotStats.streakWinsCount.toString()} `}░░░
        {` TOTAL BETS: ${totalBets.toString()} `}░░░
        {lastWinFormatted && ` LAST WIN: ${lastWinFormatted} `}░░░
      </div>
    </div>
  )
}
