import { useState } from 'react'

interface TierBenefit {
  name: string
  value: string
  highlight?: boolean
  check?: boolean
  locked?: boolean
}

interface TierData {
  name: string
  emoji: string
  minStake: string
  range: string
  benefits: TierBenefit[]
}

const TIER_DATA: Record<string, TierData> = {
  bronze: {
    name: 'Bronze',
    emoji: '🥉',
    minStake: '0',
    range: '0 - 999 $HASH',
    benefits: [
      { name: 'Payout Boost', value: '+0%', highlight: true },
      { name: 'Rakeback', value: '5%' },
      { name: 'Daily Bonus', value: '—', locked: true },
      { name: 'Max Bet', value: '$100' },
      { name: 'Referral Rate', value: '5%' },
      { name: 'VIP Support', value: '—', locked: true },
    ]
  },
  silver: {
    name: 'Silver',
    emoji: '🥈',
    minStake: '1K',
    range: '1,000 - 9,999 $HASH',
    benefits: [
      { name: 'Payout Boost', value: '+2.5%', highlight: true },
      { name: 'Rakeback', value: '10%' },
      { name: 'Daily Bonus', value: '0.05%' },
      { name: 'Max Bet', value: '$500' },
      { name: 'Referral Rate', value: '7.5%' },
      { name: 'VIP Support', value: '—', locked: true },
    ]
  },
  gold: {
    name: 'Gold',
    emoji: '🥇',
    minStake: '10K',
    range: '10,000 - 49,999 $HASH',
    benefits: [
      { name: 'Payout Boost', value: '+5%', highlight: true },
      { name: 'Rakeback', value: '15%' },
      { name: 'Daily Bonus', value: '0.1%' },
      { name: 'Max Bet', value: '$2,500' },
      { name: 'Referral Rate', value: '10%' },
      { name: 'VIP Support', value: '—', locked: true },
    ]
  },
  platinum: {
    name: 'Platinum',
    emoji: '💠',
    minStake: '50K',
    range: '50,000 - 99,999 $HASH',
    benefits: [
      { name: 'Payout Boost', value: '+7.5%', highlight: true },
      { name: 'Rakeback', value: '20%' },
      { name: 'Daily Bonus', value: '0.15%' },
      { name: 'Max Bet', value: '$10,000' },
      { name: 'Referral Rate', value: '12.5%' },
      { name: 'VIP Support', value: '✓', check: true },
    ]
  },
  diamond: {
    name: 'Diamond',
    emoji: '💎',
    minStake: '100K',
    range: '100,000+ $HASH',
    benefits: [
      { name: 'Payout Boost', value: '+10%', highlight: true },
      { name: 'Rakeback', value: '30%' },
      { name: 'Daily Bonus', value: '0.25%' },
      { name: 'Max Bet', value: 'Unlimited' },
      { name: 'Referral Rate', value: '15%' },
      { name: 'VIP Support', value: '✓', check: true },
    ]
  }
}

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond']

interface TierDisplayProps {
  currentTier?: string
  stakedAmount?: bigint
}

export function TierDisplay({ currentTier = 'bronze', stakedAmount: _stakedAmount }: TierDisplayProps) {
  // Normalize tier name to match our keys
  const normalizeTier = (tier: string) => {
    const lower = tier.toLowerCase()
    if (TIER_ORDER.includes(lower)) return lower
    return 'bronze' // fallback
  }

  const [selectedTier, setSelectedTier] = useState(normalizeTier(currentTier))
  const [viewMode, setViewMode] = useState<'visual' | 'compare'>('visual')

  const currentTierLower = normalizeTier(currentTier)
  const currentTierIndex = TIER_ORDER.indexOf(currentTierLower)
  const progressPercent = ((currentTierIndex + 1) / TIER_ORDER.length) * 100

  const tierData = TIER_DATA[selectedTier] || TIER_DATA.bronze

  return (
    <div className="border border-white/30 mt-6">
      {/* Header */}
      <div className="border-b border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs text-gray-500 uppercase tracking-wider">// Staking Tiers</h2>
          </div>
          {/* Mobile toggle */}
          <div className="flex md:hidden">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1 text-xs uppercase tracking-wider border border-r-0 ${
                viewMode === 'visual' 
                  ? 'bg-white text-black border-white' 
                  : 'border-gray-600 text-gray-500 hover:border-white hover:text-white'
              }`}
            >
              Tiers
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`px-3 py-1 text-xs uppercase tracking-wider border ${
                viewMode === 'compare' 
                  ? 'bg-white text-black border-white' 
                  : 'border-gray-600 text-gray-500 hover:border-white hover:text-white'
              }`}
            >
              Compare
            </button>
          </div>
        </div>
      </div>

      {/* Visual View */}
      <div className={`${viewMode === 'compare' ? 'hidden md:flex' : 'flex'} flex-col md:flex-row`}>
        {/* Tier Bar */}
        <div className="flex-1 p-4">
          <div className="relative py-6">
            {/* Progress line background */}
            <div className="absolute top-1/2 left-8 right-8 h-px bg-gray-700 -translate-y-1/2" />
            {/* Progress line filled */}
            <div 
              className="absolute top-1/2 left-8 h-px bg-white -translate-y-1/2 transition-all duration-500"
              style={{ width: `calc(${progressPercent}% - 64px)` }}
            />
            
            {/* Tier nodes */}
            <div className="flex justify-between relative">
              {TIER_ORDER.map((tier) => {
                const data = TIER_DATA[tier]
                const isActive = tier === selectedTier
                const isCurrent = tier === currentTierLower
                
                return (
                  <div 
                    key={tier}
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => setSelectedTier(tier)}
                  >
                    <div 
                      className={`w-12 h-12 md:w-14 md:h-14 border flex items-center justify-center bg-[#0a0a0a] transition-all ${
                        isActive 
                          ? 'border-white bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]' 
                          : 'border-gray-600 group-hover:border-white group-hover:shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                      } ${isCurrent ? 'border-2' : ''}`}
                    >
                      <span className={`text-xl md:text-2xl ${isActive ? 'grayscale brightness-0' : ''}`}>
                        {data.emoji}
                      </span>
                    </div>
                    <span className={`mt-2 text-[10px] md:text-xs uppercase tracking-wider transition-colors ${
                      isActive || isCurrent ? 'text-white' : 'text-gray-600 group-hover:text-white'
                    }`}>
                      {data.name}
                    </span>
                    <span className="text-[10px] text-gray-700">{data.minStake}</span>
                    {isCurrent && (
                      <span className="text-[10px] text-green-500 mt-1 uppercase tracking-wider">► you</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Benefits Panel */}
        <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-white/20">
          <div className="p-4 border-b border-white/20 flex items-center gap-3">
            <span className="text-2xl">{tierData.emoji}</span>
            <div>
              <h3 className="font-bold uppercase tracking-wider">{tierData.name}</h3>
              <span className="text-xs text-gray-500">{tierData.range}</span>
            </div>
          </div>
          <div className="divide-y divide-white/10">
            {tierData.benefits.map((benefit, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-gray-500 text-xs uppercase tracking-wider">{benefit.name}</span>
                <span className={`font-bold ${
                  benefit.highlight ? 'text-green-400' : 
                  benefit.check ? 'text-green-400' :
                  benefit.locked ? 'text-gray-700' : 'text-white'
                }`}>
                  {benefit.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compare View (Mobile) */}
      <div className={`${viewMode === 'visual' ? 'hidden' : 'block'} md:hidden overflow-x-auto`}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/20">
              <th className="p-2 text-left text-gray-500 uppercase">Benefit</th>
              {TIER_ORDER.map(tier => (
                <th 
                  key={tier} 
                  className={`p-2 text-center ${tier === currentTierLower ? 'bg-white/5' : ''}`}
                >
                  <div className="text-lg">{TIER_DATA[tier].emoji}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            <tr>
              <td className="p-2 text-gray-500">Min Stake</td>
              {TIER_ORDER.map(tier => (
                <td key={tier} className={`p-2 text-center ${tier === currentTierLower ? 'bg-white/5' : ''}`}>
                  {TIER_DATA[tier].minStake}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-2 text-gray-500">Boost</td>
              {TIER_ORDER.map(tier => (
                <td key={tier} className={`p-2 text-center text-green-400 ${tier === currentTierLower ? 'bg-white/5' : ''}`}>
                  {TIER_DATA[tier].benefits[0].value}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-2 text-gray-500">Rakeback</td>
              {TIER_ORDER.map(tier => (
                <td key={tier} className={`p-2 text-center ${tier === currentTierLower ? 'bg-white/5' : ''}`}>
                  {TIER_DATA[tier].benefits[1].value}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-2 text-gray-500">Daily</td>
              {TIER_ORDER.map(tier => {
                const val = TIER_DATA[tier].benefits[2]
                return (
                  <td key={tier} className={`p-2 text-center ${val.locked ? 'text-gray-700' : ''} ${tier === currentTierLower ? 'bg-white/5' : ''}`}>
                    {val.value}
                  </td>
                )
              })}
            </tr>
            <tr>
              <td className="p-2 text-gray-500">Max Bet</td>
              {TIER_ORDER.map(tier => (
                <td key={tier} className={`p-2 text-center ${tier === currentTierLower ? 'bg-white/5' : ''}`}>
                  {TIER_DATA[tier].benefits[3].value}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-2 text-gray-500">VIP</td>
              {TIER_ORDER.map(tier => {
                const val = TIER_DATA[tier].benefits[5]
                return (
                  <td key={tier} className={`p-2 text-center ${val.check ? 'text-green-400' : 'text-gray-700'} ${tier === currentTierLower ? 'bg-white/5' : ''}`}>
                    {val.value}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
