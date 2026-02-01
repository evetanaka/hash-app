import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Contract addresses - Sepolia Testnet (deployed 2025-02-01)
export const CONTRACTS = {
  hashToken: '0xeF4796fb608AF39c9dB4FC1903ed1c880C4d9b8F' as `0x${string}`,
  hashStaking: '0x0d2B19D4Eb51887cb22a1B69e5FD903ff3c602Fb' as `0x${string}`,
  hashJackpot: '0x4760Ad151103428c4bBfdc710EDc859e85703899' as `0x${string}`,
  hashGame: '0xf01F5453A08E6D961Bab8bf9f161c633Ba40F9fe' as `0x${string}`,
}

// Target chain for the app
export const TARGET_CHAIN = sepolia

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
