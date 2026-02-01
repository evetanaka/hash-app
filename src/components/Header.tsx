import { Link, useLocation } from 'react-router-dom'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useHashToken } from '../hooks/useHashToken'
import { formatEther } from 'viem'

const NAV_ITEMS = [
  { path: '/', label: 'PLAY' },
  { path: '/stake', label: 'STAKE' },
  { path: '/history', label: 'HISTORY' },
  { path: '/ref', label: 'REF' },
]

export function Header() {
  const location = useLocation()
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { balance } = useHashToken()
  const [showModal, setShowModal] = useState(false)

  const handleConnect = async (walletType: 'metamask' | 'keplr') => {
    try {
      if (walletType === 'keplr') {
        const keplr = (window as any).keplr
        if (!keplr) {
          window.open('https://www.keplr.app/download', '_blank')
          return
        }
        if (keplr.ethereum) {
          (window as any).ethereum = keplr.ethereum
        }
      } else {
        if (!(window as any).ethereum?.isMetaMask) {
          window.open('https://metamask.io/download/', '_blank')
          return
        }
      }
      
      const connector = connectors.find(c => c.id === 'injected')
      if (connector) {
        connect({ connector })
      }
    } catch (err) {
      console.error('Connection error:', err)
    }
    setShowModal(false)
  }

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-white/20 pb-6">
      <Link to="/" className="whitespace-pre text-xs md:text-sm leading-none tracking-tighter opacity-90 select-none hover:opacity-100 transition-opacity">
{`██╗  ██╗ █████╗ ███████╗██╗  ██╗
██║  ██║██╔══██╗██╔════╝██║  ██║
███████║███████║███████╗███████║
██╔══██║██╔══██║╚════██║██╔══██║
██║  ██║██║  ██║███████║██║  ██║
╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝`}
      </Link>
      
      <div className="mt-4 md:mt-0 flex flex-col items-end gap-2 w-full md:w-auto">
        <nav className="flex gap-4 text-sm">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-1 font-bold transition-colors ${
                location.pathname === item.path
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              [{item.label}]
            </Link>
          ))}
        </nav>
        
        <div className="flex items-center gap-3">
          {isConnected && balance > 0n && (
            <div className="text-sm text-gray-400">
              <span className="text-white font-bold">{Number(formatEther(balance)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> $HASH
            </div>
          )}
          
          {isConnected ? (
            <div 
              className="flex items-center gap-2 border border-white px-3 py-1 font-bold text-sm bg-black group hover:bg-white hover:text-black cursor-pointer transition-colors"
              onClick={() => disconnect()}
            >
              <Wallet size={14} />
              <span>{address?.slice(0, 4)}...{address?.slice(-4)}</span>
            </div>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 border border-white px-3 py-1 font-bold text-sm bg-black hover:bg-white hover:text-black transition-colors"
            >
              <Wallet size={14} />
              <span>CONNECT</span>
            </button>
          )}
        </div>
      </div>

      {/* Wallet Selection Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 animate-fadeIn"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-[#0a0a0a] border border-white p-6 max-w-sm w-full mx-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold tracking-wider">CONNECT WALLET</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleConnect('metamask')}
                className="flex items-center gap-4 p-4 border border-gray-700 hover:border-white hover:bg-white/5 transition-all group"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-orange-500/20 rounded">
                  <span className="text-2xl">🦊</span>
                </div>
                <div className="text-left">
                  <div className="font-bold">MetaMask</div>
                  <div className="text-xs text-gray-500">Connect with MetaMask</div>
                </div>
              </button>

              <button
                onClick={() => handleConnect('keplr')}
                className="flex items-center gap-4 p-4 border border-gray-700 hover:border-white hover:bg-white/5 transition-all group"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-purple-500/20 rounded">
                  <span className="text-2xl">⚛️</span>
                </div>
                <div className="text-left">
                  <div className="font-bold">Keplr</div>
                  <div className="text-xs text-gray-500">Connect with Keplr</div>
                </div>
              </button>
            </div>

            <p className="text-[10px] text-gray-600 mt-6 text-center">
              By connecting, you agree to our Terms of Service
            </p>
          </div>
        </div>
      )}
    </header>
  )
}
