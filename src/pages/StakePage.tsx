import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useHashStaking } from '../hooks/useHashStaking'
import { useHashToken } from '../hooks/useHashToken'
import { TokenApproval } from '../components/TokenApproval'
import { GetHashCTA } from '../components/GetHashCTA'
import { TierDisplay } from '../components/TierDisplay'

const TIER_COLORS: Record<string, string> = {
  'Bronze': 'text-orange-600',
  'Silver': 'text-gray-400',
  'Gold': 'text-yellow-500',
  'Platinum': 'text-blue-300',
  'Diamond': 'text-cyan-400',
}

export function StakePage() {
  const { isConnected } = useAccount()
  const { balance, refetchBalance } = useHashToken()
  const {
    stakeInfo,
    tierInfo,
    tierName,
    globalStats,
    pendingRewards,
    formattedPendingRewards,
    lockDurationDays,
    stake,
    addToStake,
    unstake,
    emergencyUnstake,
    claimRewards,
    isStaking,
    isStakeConfirming,
    isStakeConfirmed,
    isAddingStake,
    isAddStakeConfirming,
    isAddStakeConfirmed,
    isUnstaking,
    isUnstakeConfirming,
    isUnstakeConfirmed,
    isEmergencyUnstaking,
    isEmergencyUnstakeConfirming,
    isEmergencyUnstakeConfirmed,
    isClaiming,
    isClaimConfirming,
    isClaimConfirmed,
    refetchAll,
  } = useHashStaking()

  const [stakeAmount, setStakeAmount] = useState('1000')
  const [showEmergency, setShowEmergency] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Refetch on successful actions with graceful delay
  useEffect(() => {
    const txConfirmed = isStakeConfirmed || isAddStakeConfirmed || isUnstakeConfirmed || isEmergencyUnstakeConfirmed || isClaimConfirmed
    
    if (txConfirmed && !isRefreshing) {
      setIsRefreshing(true)
      
      // Small delay to ensure blockchain state is updated
      const timer = setTimeout(() => {
        refetchAll()
        refetchBalance()
        setIsRefreshing(false)
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [isStakeConfirmed, isAddStakeConfirmed, isUnstakeConfirmed, isEmergencyUnstakeConfirmed, isClaimConfirmed])

  const hasExistingStake = stakeInfo && stakeInfo.amount > 0n
  const stakeAmountBigInt = parseEther(stakeAmount || '0')
  const canStake = stakeAmountBigInt > 0n && stakeAmountBigInt <= balance
  const canUnstake = hasExistingStake && !stakeInfo?.isLocked

  const isProcessing = isStaking || isStakeConfirming || isAddingStake || isAddStakeConfirming || 
    isUnstaking || isUnstakeConfirming || isClaiming || isClaimConfirming ||
    isEmergencyUnstaking || isEmergencyUnstakeConfirming

  // Calculate APY (simplified - based on reward pool and total staked)
  const estimatedAPY = globalStats && globalStats.totalStaked > 0n
    ? (Number(formatEther(globalStats.rewardPool)) / Number(formatEther(globalStats.totalStaked)) * 100 * 365).toFixed(1)
    : '0'

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold mb-2">CONNECT WALLET</h2>
        <p className="text-gray-500">Connect your wallet to stake $HASH tokens</p>
      </div>
    )
  }

  return (
    <main className="max-w-3xl mx-auto mt-4">
      <GetHashCTA />

      {/* GLOBAL STATS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-white/20 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">TOTAL STAKED</div>
          <div className="text-xl font-bold">
            {globalStats ? Number(formatEther(globalStats.totalStaked)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '...'} 
            <span className="text-xs text-gray-500 ml-1">$HASH</span>
          </div>
        </div>
        <div className="border border-white/20 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">REWARD POOL</div>
          <div className="text-xl font-bold text-green-400">
            {globalStats ? Number(formatEther(globalStats.rewardPool)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '...'}
            <span className="text-xs text-gray-500 ml-1">$HASH</span>
          </div>
        </div>
        <div className="border border-white/20 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">EST. APY</div>
          <div className="text-xl font-bold text-yellow-500">
            {estimatedAPY}%
          </div>
        </div>
      </div>

      {/* TIER DISPLAY */}
      <TierDisplay currentTier={tierName} stakedAmount={stakeInfo?.amount} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* YOUR STAKE */}
        <div className="border border-white p-6">
          <h2 className="text-lg font-bold mb-4 border-b border-white/20 pb-2">YOUR STAKE</h2>
          
          {hasExistingStake ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500">STAKED AMOUNT</div>
                <div className="text-2xl font-bold">
                  {Number(formatEther(stakeInfo!.amount)).toLocaleString()} $HASH
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="text-xs text-gray-500">TIER</div>
                  <div className={`text-lg font-bold ${TIER_COLORS[tierName] || 'text-white'}`}>
                    {tierName.toUpperCase()}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500">PAYOUT BOOST</div>
                  <div className="text-lg font-bold text-green-400">
                    +{tierInfo ? (tierInfo.boostBps / 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>

              {stakeInfo?.isLocked && (
                <div className="border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
                  <div className="text-yellow-500 font-bold">🔒 LOCKED</div>
                  <div className="text-gray-400">
                    {Number(stakeInfo.daysRemaining)} days remaining
                  </div>
                </div>
              )}

              {/* ADD MORE STAKE */}
              <div className="pt-4 border-t border-white/20">
                <div className="text-xs text-gray-500 mb-2">ADD TO STAKE</div>
                <TokenApproval target="staking" amount={stakeAmountBigInt}>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="flex-1 bg-black border border-gray-600 px-3 py-2 text-sm focus:border-white focus:outline-none"
                      placeholder="Amount"
                    />
                    <button
                      onClick={() => addToStake(stakeAmountBigInt)}
                      disabled={!canStake || isProcessing}
                      className="px-4 py-2 text-sm font-bold border border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingStake || isAddStakeConfirming ? '...' : 'ADD'}
                    </button>
                  </div>
                </TokenApproval>
              </div>

              {/* UNSTAKE */}
              <div className="pt-4 border-t border-white/20 flex gap-2">
                <button
                  onClick={unstake}
                  disabled={!canUnstake || isProcessing}
                  className="flex-1 px-4 py-2 text-sm font-bold border border-red-500 text-red-500 hover:bg-red-500 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUnstaking || isUnstakeConfirming ? 'UNSTAKING...' : 'UNSTAKE'}
                </button>
                
                {stakeInfo?.isLocked && (
                  <button
                    onClick={() => setShowEmergency(!showEmergency)}
                    className="px-4 py-2 text-sm border border-gray-600 text-gray-500 hover:border-white hover:text-white"
                  >
                    ⚠️
                  </button>
                )}
              </div>

              {/* EMERGENCY UNSTAKE */}
              {showEmergency && stakeInfo?.isLocked && (
                <div className="border border-red-500/50 bg-red-500/10 p-3 text-sm">
                  <div className="text-red-500 font-bold mb-2">⚠️ EMERGENCY UNSTAKE</div>
                  <p className="text-gray-400 text-xs mb-3">
                    You will lose 10% of your stake as a penalty for early withdrawal.
                  </p>
                  <button
                    onClick={emergencyUnstake}
                    disabled={isProcessing}
                    className="w-full px-4 py-2 text-sm font-bold bg-red-500 text-black hover:bg-red-400 transition-colors disabled:opacity-50"
                  >
                    {isEmergencyUnstaking || isEmergencyUnstakeConfirming ? 'PROCESSING...' : 'CONFIRM EMERGENCY UNSTAKE'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📭</div>
              <p>No active stake</p>
              <p className="text-xs mt-2">Stake $HASH to earn rewards and tier bonuses</p>
            </div>
          )}
        </div>

        {/* STAKE / REWARDS */}
        <div className="space-y-6">
          {/* NEW STAKE (only if no existing stake) */}
          {!hasExistingStake && (
            <div className="border border-white p-6">
              <h2 className="text-lg font-bold mb-4 border-b border-white/20 pb-2">STAKE $HASH</h2>
              
              <TokenApproval target="staking">
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-2">STAKE AMOUNT</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="flex-1 bg-black border border-white px-4 py-3 font-mono focus:outline-none focus:ring-1 focus:ring-white"
                        placeholder="Enter amount"
                      />
                      <button
                        onClick={() => setStakeAmount(formatEther(balance))}
                        className="px-4 py-3 border border-gray-600 text-gray-400 hover:border-white hover:text-white"
                      >
                        MAX
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Balance: {Number(formatEther(balance)).toLocaleString()} $HASH
                    </div>
                  </div>

                  <div className="border border-gray-700 p-3 text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-500">Lock Period:</span>
                      <span>{lockDurationDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Early Withdraw Penalty:</span>
                      <span className="text-red-500">10%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => stake(stakeAmountBigInt)}
                    disabled={!canStake || isProcessing}
                    className="w-full px-6 py-3 font-bold bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isStaking ? 'CONFIRM IN WALLET...' : isStakeConfirming ? 'STAKING...' : 'STAKE NOW'}
                  </button>
                </div>
              </TokenApproval>
            </div>
          )}

          {/* REWARDS */}
          <div className="border border-green-500/50 p-6">
            <h2 className="text-lg font-bold mb-4 border-b border-green-500/20 pb-2 text-green-400">REWARDS</h2>
            
            <div className="text-center mb-4">
              <div className="text-xs text-gray-500">PENDING REWARDS</div>
              <div className="text-3xl font-bold text-green-400">
                {Number(formattedPendingRewards).toLocaleString(undefined, { maximumFractionDigits: 2 })} $HASH
              </div>
            </div>

            <button
              onClick={claimRewards}
              disabled={pendingRewards <= 0n || isProcessing}
              className="w-full px-6 py-3 font-bold border border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClaiming ? 'CONFIRM IN WALLET...' : isClaimConfirming ? 'CLAIMING...' : 'CLAIM REWARDS'}
            </button>

            <p className="text-xs text-gray-600 mt-4 text-center">
              Rewards come from house edge on all bets placed
            </p>
          </div>

        </div>
      </div>
    </main>
  )
}
