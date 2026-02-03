import type { GasError } from '../hooks/useCyberSlots'

interface GasErrorAlertProps {
  error: GasError
  onRetry: () => void
  onDismiss: () => void
}

export function GasErrorAlert({ error, onRetry, onDismiss }: GasErrorAlertProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-red-500/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
        {/* Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Transaction Failed</h3>
        </div>
        
        {/* Message */}
        <p className="text-gray-300 mb-4">
          {error.type === 'estimation' 
            ? "Gas estimation failed. The transaction might need more gas to complete."
            : "Transaction ran out of gas. Try again with a higher gas limit."
          }
        </p>
        
        {/* Gas info */}
        <div className="bg-gray-800 rounded-lg p-3 mb-5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Suggested gas:</span>
            <span className="text-cyan-400 font-mono">{Number(error.suggestedGas).toLocaleString()}</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
          >
            Retry with more gas
          </button>
        </div>
      </div>
    </div>
  )
}
