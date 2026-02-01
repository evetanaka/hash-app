import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, useReconnect } from 'wagmi'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { config } from './config/wagmi'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { JackpotBanner } from './components/JackpotBanner'
import { NetworkGuard } from './components/NetworkGuard'
import { HomePage, PlayPage, StakePage, HistoryPage, RefPage } from './pages'

const queryClient = new QueryClient()

// Auto-reconnect wallet on page load
function WalletReconnect({ children }: { children: React.ReactNode }) {
  const { reconnect } = useReconnect()
  
  useEffect(() => {
    reconnect()
  }, [reconnect])
  
  return <>{children}</>
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-white selection:text-black overflow-x-hidden relative">
      {/* CRT Scanline Overlay - subtle */}
      <div 
        className="pointer-events-none fixed inset-0 z-50 w-full h-full opacity-[0.03]" 
        style={{
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
          backgroundSize: '100% 2px'
        }} 
      />

      <div className="relative z-10 container mx-auto max-w-6xl p-4 flex flex-col gap-6">
        <Header />
        <JackpotBanner />
        {children}
        <Footer />
      </div>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletReconnect>
          <BrowserRouter>
            <NetworkGuard>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/play" element={<PlayPage />} />
                  <Route path="/stake" element={<StakePage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/ref" element={<RefPage />} />
                </Routes>
              </Layout>
            </NetworkGuard>
          </BrowserRouter>
        </WalletReconnect>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
