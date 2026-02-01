import { useHashJackpot } from '../hooks/useHashJackpot'
import { useBlockNumber } from 'wagmi'
import { TARGET_CHAIN } from '../config/wagmi'
import { formatEther } from 'viem'

export function JackpotBanner() {
  const { currentPot, stats } = useHashJackpot()
  const { data: blockNumber } = useBlockNumber({ chainId: TARGET_CHAIN.id, watch: true })

  const formattedPot = Number(formatEther(currentPot)).toLocaleString(undefined, { maximumFractionDigits: 0 })

  return (
    <div className="w-full overflow-hidden border-y border-white/30 py-2 bg-white/5">
      <div className="animate-marquee whitespace-nowrap font-bold tracking-widest text-sm md:text-base">
        ░░░ JACKPOT: {formattedPot} $HASH ░░░ 5 WINS TO CLAIM ░░░ BLOCK #{blockNumber?.toString() || '...'} ░░░ 
        {stats && ` TOTAL WINS: ${stats.streakWinsCount.toString()} `}░░░
      </div>
    </div>
  )
}
