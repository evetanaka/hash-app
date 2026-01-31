import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { config } from './config/wagmi'
import { Game } from './components'
import './App.css'

const queryClient = new QueryClient()

function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div className="wallet-connected">
        <span className="address">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    )
  }

  return (
    <div className="connect-wallet">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  )
}

function Header() {
  return (
    <header className="header">
      <div className="logo">
        <span className="logo-icon">🎲</span>
        <span className="logo-text">$HASH</span>
      </div>
      <nav className="nav">
        <a href="#play" className="active">Play</a>
        <a href="#staking">Staking</a>
        <a href="#referrals">Referrals</a>
        <a href="#history">History</a>
      </nav>
      <ConnectWallet />
    </header>
  )
}

function JackpotBanner() {
  return (
    <div className="jackpot-banner">
      <span>🏆 JACKPOT</span>
      <span className="jackpot-amount">45,230 $HASH</span>
      <span className="jackpot-hint">5 wins in a row to claim!</span>
    </div>
  )
}

function AppContent() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <JackpotBanner />
        <Game />
      </main>
      <footer className="footer">
        <p>Predict the block. Win the hash.</p>
        <div className="links">
          <a href="#">Docs</a>
          <a href="#">Twitter</a>
          <a href="#">Discord</a>
        </div>
      </footer>
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
