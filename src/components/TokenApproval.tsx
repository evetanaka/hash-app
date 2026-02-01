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
  } = useHashToken()

  const hasApproval = target === 'game' ? hasGameApproval : hasStakingApproval
  const allowance = target === 'game' ? gameAllowance : stakingAllowance
  const approve = target === 'game' ? approveGame : approveStaking

  // Check if amount exceeds allowance
  const needsApproval = amount ? allowance < amount : !hasApproval

  // If approved, call callback
  if (isApproveConfirmed && onApproved) {
    onApproved()
  }

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
