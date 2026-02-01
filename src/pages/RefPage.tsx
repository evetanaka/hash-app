import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useHashStaking } from '../hooks/useHashStaking'

export function RefPage() {
  const { address, isConnected } = useAccount()
  const { tierInfo, tierName, referrer, stakeInfo } = useHashStaking()
  const [copied, setCopied] = useState(false)

  const referralLink = address ? `${window.location.origin}?ref=${address}` : ''
  const referralCode = address ? address.slice(0, 10) : ''

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🔗</div>
        <h2 className="text-2xl font-bold mb-2">CONNECT WALLET</h2>
        <p className="text-gray-500">Connect your wallet to access referral features</p>
      </div>
    )
  }

  const hasStake = stakeInfo && stakeInfo.amount > 0n
  const referralFee = tierInfo ? tierInfo.referralFeeBps / 100 : 0

  return (
    <main className="max-w-2xl mx-auto mt-4">
      <h1 className="text-2xl font-bold mb-6">REFERRAL PROGRAM</h1>

      {/* REFERRAL LINK */}
      <div className="border border-white p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 border-b border-white/20 pb-2">YOUR REFERRAL LINK</h2>
        
        {hasStake ? (
          <div className="space-y-4">
            <div className="bg-black border border-gray-600 p-4 font-mono text-sm break-all">
              {referralLink}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(referralLink)}
                className="flex-1 px-4 py-2 font-bold border border-white hover:bg-white hover:text-black transition-colors"
              >
                {copied ? '✓ COPIED!' : 'COPY LINK'}
              </button>
              <button
                onClick={() => copyToClipboard(referralCode)}
                className="px-4 py-2 border border-gray-600 text-gray-400 hover:border-white hover:text-white"
              >
                CODE: {referralCode}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">🔒</div>
            <p className="mb-2">Stake $HASH to unlock referrals</p>
            <p className="text-xs">Stakers can earn commission on referred players' bets</p>
          </div>
        )}
      </div>

      {/* REFERRAL STATS */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-white/20 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">YOUR TIER</div>
          <div className="text-xl font-bold">{tierName.toUpperCase()}</div>
        </div>
        <div className="border border-green-500/30 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">COMMISSION RATE</div>
          <div className="text-xl font-bold text-green-400">{referralFee}%</div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="border border-white/20 p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">HOW IT WORKS</h2>
        <div className="space-y-4 text-sm">
          <div className="flex gap-4">
            <div className="w-8 h-8 flex items-center justify-center border border-white font-bold flex-shrink-0">1</div>
            <div>
              <div className="font-bold">SHARE YOUR LINK</div>
              <div className="text-gray-500">Send your referral link to friends who want to play</div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 flex items-center justify-center border border-white font-bold flex-shrink-0">2</div>
            <div>
              <div className="font-bold">THEY PLAY</div>
              <div className="text-gray-500">When they stake using your link, you're set as their referrer</div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 flex items-center justify-center border border-white font-bold flex-shrink-0">3</div>
            <div>
              <div className="font-bold">YOU EARN</div>
              <div className="text-gray-500">Earn {referralFee}% of house edge on all their bets, forever</div>
            </div>
          </div>
        </div>
      </div>

      {/* TIER COMMISSION RATES */}
      <div className="border border-white/20 p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">TIER COMMISSION RATES</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-orange-600">BRONZE</span>
            <span>0.5%</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-gray-400">SILVER</span>
            <span>1.0%</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-yellow-500">GOLD</span>
            <span>1.5%</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-blue-300">PLATINUM</span>
            <span>2.0%</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-cyan-400">DIAMOND</span>
            <span>2.5%</span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Higher tiers unlock higher commission rates. Stake more to level up!
        </p>
      </div>

      {/* YOUR REFERRER */}
      {referrer && referrer !== '0x0000000000000000000000000000000000000000' && (
        <div className="border border-purple-500/30 p-4 text-sm">
          <div className="text-purple-400 font-bold mb-1">YOUR REFERRER</div>
          <div className="font-mono text-gray-400">{referrer}</div>
          <p className="text-xs text-gray-600 mt-2">
            Your referrer earns commission on your bets
          </p>
        </div>
      )}
    </main>
  )
}
