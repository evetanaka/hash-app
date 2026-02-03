import { http, createConfig, createStorage, cookieStorage } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Contract addresses - Sepolia Testnet (deployed 2026-02-03)
// V3 Architecture: JackpotVault (UUPS) + Game contracts
export const CONTRACTS = {
  hashToken: '0xeF4796fb608AF39c9dB4FC1903ed1c880C4d9b8F' as `0x${string}`,
  hashStaking: '0x0d2B19D4Eb51887cb22a1B69e5FD903ff3c602Fb' as `0x${string}`,
  jackpotVault: '0xD0A14446a07928520158A3CE376Cf1Bef0B89eD1' as `0x${string}`,
  hashGame: '0xdEC5E4095b57219c1dCb9dD44083D769b4c0B690' as `0x${string}`,
  cyberSlots: '0x8926047a128cf9302A904080825C67FE2E2dC8A8' as `0x${string}`,  // V4 - 3x3 Grid
  // Legacy (deprecated)
  hashJackpot: '0x4760Ad151103428c4bBfdc710EDc859e85703899' as `0x${string}`,
}

// Target chain for the app
export const TARGET_CHAIN = sepolia

// Safe storage that works in browser
const storage = typeof window !== 'undefined' 
  ? createStorage({ storage: window.localStorage, key: 'hash-app' })
  : createStorage({ storage: cookieStorage })

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
  storage,
  syncConnectedChain: true,
  multiInjectedProviderDiscovery: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
