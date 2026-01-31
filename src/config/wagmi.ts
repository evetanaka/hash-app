import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Contract addresses (update after deployment)
export const CONTRACTS = {
  hashToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  hashStaking: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  hashGame: '0x0000000000000000000000000000000000000000' as `0x${string}`,
}

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
