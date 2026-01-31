import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Wallet } from 'lucide-react'
import { config } from './config/wagmi'
import { Game } from './components'
import { useState, useEffect } from 'react'

const queryClient = new QueryClient()

function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div 
        className="flex items-center gap-2 border border-white px-3 py-1 font-bold text-sm bg-black group hover:bg-white hover:text-black cursor-pointer transition-colors"
        onClick={() => disconnect()}
      >
        <Wallet size={14} />
        <span>{address?.slice(0, 4)}...{address?.slice(-4)}</span>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className="flex items-center gap-2 border border-white px-3 py-1 font-bold text-sm bg-black hover:bg-white hover:text-black transition-colors"
        >
          <Wallet size={14} />
          <span>CONNECT</span>
        </button>
      ))}
    </div>
  )
}

function Header() {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-white/20 pb-6">
      <div className="whitespace-pre text-xs md:text-sm leading-none tracking-tighter opacity-90 select-none">
{`██╗  ██╗ █████╗ ███████╗██╗  ██╗
██║  ██║██╔══██╗██╔════╝██║  ██║
███████║███████║███████╗███████║
██╔══██║██╔══██║╚════██║██╔══██║
██║  ██║██║  ██║███████║██║  ██║
╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝`}
      </div>
      
      <div className="mt-4 md:mt-0 flex flex-col items-end gap-2 w-full md:w-auto">
        <nav className="flex gap-4 text-sm">
          {[
            { key: 'PLAY', href: '#play' },
            { key: 'STAKE', href: '#staking' },
            { key: 'REF', href: '#referrals' },
            { key: 'HISTORY', href: '#history' }
          ].map(item => (
            <a 
              key={item.key} 
              href={item.href}
              className="hover:bg-white hover:text-black px-1 transition-colors duration-75 text-gray-400"
            >
              [{item.key}]
            </a>
          ))}
        </nav>
        <ConnectWallet />
      </div>
    </header>
  )
}

function JackpotBanner() {
  const [jackpot, setJackpot] = useState(45230)

  useEffect(() => {
    const interval = setInterval(() => {
      setJackpot(prev => prev + Math.floor(Math.random() * 10))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full overflow-hidden border-y border-white/30 py-2 bg-white/5">
      <div className="animate-marquee whitespace-nowrap font-bold tracking-widest text-sm md:text-base">
        ░░░ JACKPOT: {jackpot.toLocaleString()} $HASH ░░░ 5 WINS TO CLAIM ░░░ PREDICT THE BLOCK. WIN THE HASH. ░░░
      </div>
    </div>
  )
}

function AppContent() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-white selection:text-black overflow-x-hidden relative">
      {/* CRT Scanline Overlay - subtle */}
      <div className="pointer-events-none fixed inset-0 z-50 w-full h-full opacity-5" 
           style={{
             background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
             backgroundSize: '100% 2px'
           }} 
      />

      <div className="relative z-10 container mx-auto max-w-4xl p-4 flex flex-col gap-6">
        <Header />
        
        <JackpotBanner />
        
        <main className="mt-4">
          <Game />
        </main>

        <footer className="mt-8 border-t border-white/20 pt-6 pb-10 text-center flex flex-col items-center gap-4">
          <p className="text-xl tracking-[0.2em] font-bold">PREDICT THE BLOCK. WIN THE HASH.</p>
          <div className="flex gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-white hover:underline">[DOCS]</a>
            <a href="#" className="hover:text-white hover:underline">[TWITTER]</a>
            <a href="#" className="hover:text-white hover:underline">[DISCORD]</a>
          </div>
          <p className="text-[10px] text-gray-700 mt-4 max-w-md">
            DISCLAIMER: GAMBLING WITH $HASH IS UNREGULATED. PLAY RESPONSIBLY.
          </p>
        </footer>
      </div>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  )
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
