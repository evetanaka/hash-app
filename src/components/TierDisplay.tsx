import { useState, useEffect } from 'react'

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
      { name: 'Max Bet', value: '$100' },
      { name: 'Referral Rate', value: '5%' },
    ]
  },
  silver: {
    name: 'Silver',
    emoji: '🥈',
    minStake: '1K',
    range: '1,000 - 9,999 $HASH',
    benefits: [
      { name: 'Payout Boost', value: '+2.5%', highlight: true },
      { name: 'Max Bet', value: '$500' },
      { name: 'Referral Rate', value: '7.5%' },
    ]
  },
  gold: {
    name: 'Gold',
    emoji: '🥇',
    minStake: '10K',
    range: '10,000 - 49,999 $HASH',
    benefits: [
      { name: 'Payout Boost', value: '+5%', highlight: true },
      { name: 'Max Bet', value: '$2,500' },
      { name: 'Referral Rate', value: '10%' },
    ]
  },
  platinum: {
    name: 'Platinum',
    emoji: '💠',
    minStake: '50K',
    range: '50,000 - 99,999 $HASH',
    benefits: [
      { name: 'Payout Boost', value: '+7.5%', highlight: true },
      { name: 'Max Bet', value: '$10,000' },
      { name: 'Referral Rate', value: '12.5%' },
    ]
  },
  diamond: {
    name: 'Diamond',
    emoji: '💎',
    minStake: '100K',
    range: '100,000+ $HASH',
    benefits: [
      { name: 'Payout Boost', value: '+10%', highlight: true },
      { name: 'Max Bet', value: 'Unlimited' },
      { name: 'Referral Rate', value: '15%' },
    ]
  }
}

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond']

interface TierDisplayProps {
  currentTier?: string
  stakedAmount?: bigint
}

export function TierDisplay({ currentTier = 'bronze', stakedAmount: _stakedAmount }: TierDisplayProps) {
  const normalizeTier = (tier: string) => {
    const lower = tier.toLowerCase()
    if (TIER_ORDER.includes(lower)) return lower
    return 'bronze'
  }

  const [selectedTier, setSelectedTier] = useState(normalizeTier(currentTier))
  const [viewMode, setViewMode] = useState<'visual' | 'compare'>('visual')

  // Sync selectedTier with currentTier when it changes (e.g., after data loads)
  useEffect(() => {
    setSelectedTier(normalizeTier(currentTier))
  }, [currentTier])

  const currentTierLower = normalizeTier(currentTier)
  const currentTierIndex = TIER_ORDER.indexOf(currentTierLower)
  const progressPercent = ((currentTierIndex + 0.5) / TIER_ORDER.length) * 100

  const tierData = TIER_DATA[selectedTier] || TIER_DATA.bronze

  return (
    <div className="border border-white/30 mt-6">
      {/* Header */}
      <div className="border-b border-white/20 px-4 py-3 flex items-center justify-between">
        <h2 className="text-xs text-gray-500 uppercase tracking-wider">// Staking Tiers</h2>
        {/* Mobile toggle */}
        <div className="flex md:hidden">
          <button
            onClick={() => setViewMode('visual')}
            className={`px-3 py-1 text-xs uppercase tracking-wider border border-r-0 ${
              viewMode === 'visual' 
                ? 'bg-white text-black border-white' 
                : 'border-gray-600 text-gray-500'
            }`}
          >
            Tiers
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`px-3 py-1 text-xs uppercase tracking-wider border ${
              viewMode === 'compare' 
                ? 'bg-white text-black border-white' 
                : 'border-gray-600 text-gray-500'
            }`}
          >
            Compare
          </button>
        </div>
      </div>

      {/* Visual View */}
      <div className={`${viewMode === 'compare' ? 'hidden md:flex' : 'flex'} flex-col md:flex-row`}>
        {/* Tier Bar */}
        <div className="flex-1 p-4 flex items-center">
          <div className="relative w-full">
            {/* Progress line background */}
            <div className="absolute top-7 left-6 right-6 h-px bg-gray-800" />
            {/* Progress line filled */}
            <div 
              className="absolute top-7 left-6 h-px bg-white/50 transition-all duration-500"
              style={{ width: `calc(${progressPercent}% - 24px)` }}
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
                    className="flex flex-col items-center cursor-pointer group relative"
                    onClick={() => setSelectedTier(tier)}
                  >
                    <div 
                      className={`w-14 h-14 border flex items-center justify-center bg-[#0a0a0a] transition-all ${
                        isActive 
                          ? 'border-white bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]' 
                          : 'border-gray-700 group-hover:border-white'
                      } ${isCurrent && !isActive ? 'border-white/50' : ''}`}
                    >
                      <span className={`text-2xl ${isActive ? 'grayscale brightness-0' : ''}`}>
                        {data.emoji}
                      </span>
                    </div>
                    <span className={`mt-2 text-[11px] uppercase tracking-wider transition-colors ${
                      isActive || isCurrent ? 'text-white font-bold' : 'text-gray-600 group-hover:text-white'
                    }`}>
                      {data.name}
                    </span>
                    <span className="text-[10px] text-gray-700">{data.minStake}</span>
                    {isCurrent && (
                      <span className="absolute -bottom-5 text-[10px] text-green-500 uppercase tracking-wider whitespace-nowrap">► you</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Benefits Panel */}
        <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-white/20 flex flex-col">
          <div className="px-4 py-3 border-b border-white/20 flex items-center gap-3">
            <span className="text-xl">{tierData.emoji}</span>
            <div>
              <h3 className="font-bold uppercase tracking-wider text-sm">{tierData.name}</h3>
              <span className="text-[10px] text-gray-500">{tierData.range}</span>
            </div>
          </div>
          <div className="flex-1">
            {tierData.benefits.map((benefit, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-2 border-b border-white/5 last:border-b-0">
                <span className="text-gray-500 text-[11px] uppercase tracking-wider">{benefit.name}</span>
                <span className={`font-bold text-sm ${
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
              <td className="p-2 text-gray-500">Max Bet</td>
              {TIER_ORDER.map(tier => (
                <td key={tier} className={`p-2 text-center ${tier === currentTierLower ? 'bg-white/5' : ''}`}>
                  {TIER_DATA[tier].benefits[1].value}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-2 text-gray-500">Referral</td>
              {TIER_ORDER.map(tier => (
                <td key={tier} className={`p-2 text-center ${tier === currentTierLower ? 'bg-white/5' : ''}`}>
                  {TIER_DATA[tier].benefits[2].value}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
