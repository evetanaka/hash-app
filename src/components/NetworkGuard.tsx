import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { TARGET_CHAIN } from '../config/wagmi'

interface NetworkGuardProps {
  children: React.ReactNode
}

export function NetworkGuard({ children }: NetworkGuardProps) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()

  // Not connected - show children (they'll handle connect prompts)
  if (!isConnected) {
    return <>{children}</>
  }

  // Wrong network
  if (chainId !== TARGET_CHAIN.id) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 animate-fadeIn">
        <div className="bg-[#0a0a0a] border-2 border-yellow-500 p-8 max-w-md w-full mx-4 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold tracking-wider mb-4 text-yellow-500">WRONG NETWORK</h2>
          <p className="text-gray-400 mb-6">
            Please switch to <span className="text-white font-bold">{TARGET_CHAIN.name}</span> to use this app.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
              disabled={isPending}
              className="w-full px-6 py-3 font-bold border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-colors disabled:opacity-50"
            >
              {isPending ? 'SWITCHING...' : `SWITCH TO ${TARGET_CHAIN.name.toUpperCase()}`}
            </button>
            <div className="text-xs text-gray-600">
              Chain ID: {TARGET_CHAIN.id}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
