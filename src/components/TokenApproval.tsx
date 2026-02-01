import { useEffect, useRef } from 'react'
import { useHashToken } from '../hooks/useHashToken'
import { formatEther } from 'viem'

interface TokenApprovalProps {
  target: 'game' | 'staking'
  amount?: bigint
  onApproved?: () => void
  children: React.ReactNode
}

export function TokenApproval({ target, amount, onApproved, children }: TokenApprovalProps) {
  const {
    hasGameApproval,
    hasStakingApproval,
    gameAllowance,
    stakingAllowance,
    approveGame,
    approveStaking,
    isApproving,
    isApproveConfirming,
    isApproveConfirmed,
    refetchGameAllowance,
    refetchStakingAllowance,
  } = useHashToken()

  const hasApproval = target === 'game' ? hasGameApproval : hasStakingApproval
  const allowance = target === 'game' ? gameAllowance : stakingAllowance
  const approve = target === 'game' ? approveGame : approveStaking
  const refetchAllowance = target === 'game' ? refetchGameAllowance : refetchStakingAllowance

  // Track if we've already handled this confirmation
  const hasHandledConfirmation = useRef(false)

  // Check if amount exceeds allowance
  const needsApproval = amount ? allowance < amount : !hasApproval

  // Refetch allowance when approval is confirmed
  useEffect(() => {
    if (isApproveConfirmed && !hasHandledConfirmation.current) {
      hasHandledConfirmation.current = true
      // Refetch allowance after a short delay to ensure blockchain state is updated
      const timeout = setTimeout(() => {
        refetchAllowance()
        if (onApproved) {
          onApproved()
        }
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [isApproveConfirmed, refetchAllowance, onApproved])

  // Reset the ref when starting a new approval
  useEffect(() => {
    if (isApproving) {
      hasHandledConfirmation.current = false
    }
  }, [isApproving])

  // Has sufficient approval
  if (!needsApproval) {
    return <>{children}</>
  }

  const isPending = isApproving || isApproveConfirming

  return (
    <div className="border border-yellow-500/50 bg-yellow-500/5 p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🔐</div>
        <div className="flex-1">
          <h3 className="font-bold text-yellow-500 mb-1">APPROVAL REQUIRED</h3>
          <p className="text-sm text-gray-400 mb-3">
            Allow the {target === 'game' ? 'Hash Game' : 'Staking'} contract to spend your $HASH tokens.
            {amount && (
              <span className="block mt-1 text-white">
                Amount needed: {formatEther(amount)} $HASH
              </span>
            )}
          </p>
          <button
            onClick={() => approve(amount)}
            disabled={isPending}
            className="px-4 py-2 font-bold border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-colors disabled:opacity-50 text-sm"
          >
            {isApproving ? 'CONFIRM IN WALLET...' : 
             isApproveConfirming ? 'PROCESSING...' : 
             'APPROVE $HASH'}
          </button>
        </div>
      </div>
    </div>
  )
}
