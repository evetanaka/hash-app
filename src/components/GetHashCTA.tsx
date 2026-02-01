import { useHashToken } from '../hooks/useHashToken'
import { useAccount } from 'wagmi'
import { CONTRACTS } from '../config/wagmi'

export function GetHashCTA() {
  const { isConnected } = useAccount()
  const { balance } = useHashToken()

  // Only show if connected but no balance
  if (!isConnected || balance > 0n) {
    return null
  }

  const sepoliaFaucetUrl = `https://sepolia.etherscan.io/address/${CONTRACTS.hashToken}`

  return (
    <div className="border border-blue-500/50 bg-blue-500/5 p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">💰</div>
        <div className="flex-1">
          <h3 className="font-bold text-blue-400 mb-1">GET $HASH TOKENS</h3>
          <p className="text-sm text-gray-400 mb-3">
            You need $HASH tokens to play. On testnet, you can get them from the faucet or contact us.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={sepoliaFaucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 font-bold border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-black transition-colors text-sm"
            >
              VIEW TOKEN ↗
            </a>
            <a
              href="https://discord.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 font-bold border border-gray-600 text-gray-400 hover:border-white hover:text-white transition-colors text-sm"
            >
              JOIN DISCORD ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
