export enum GameMode {
  ONE_DIGIT = 0,
  TWO_DIGIT = 1,
  THREE_DIGIT = 2,
}

export enum BetStatus {
  PENDING = 0,
  WON = 1,
  LOST = 2,
  EXPIRED = 3,
  RIDING = 4,
}

export interface Bet {
  id: bigint
  player: `0x${string}`
  amount: bigint
  mode: GameMode
  prediction: number
  targetBlock: bigint
  status: BetStatus
  isRide: boolean
  payout: bigint
}

export interface Tier {
  minStake: bigint
  boostBps: number
  maxBetUsd: bigint
  referralFeeBps: number
}

export const TIER_NAMES = ['Base', 'Bronze', 'Silver', 'Gold', 'Diamond'] as const
export type TierName = typeof TIER_NAMES[number]

export const GAME_MODE_CONFIG = {
  [GameMode.ONE_DIGIT]: {
    name: '1 Digit',
    choices: 16,
    basePayout: 10,
    ridePayout: 20,
    description: 'Guess the last hex digit (0-f)',
  },
  [GameMode.TWO_DIGIT]: {
    name: '2 Digits',
    choices: 256,
    basePayout: 150,
    ridePayout: 300,
    description: 'Guess the last two hex digits (00-ff)',
  },
  [GameMode.THREE_DIGIT]: {
    name: '3 Digits',
    choices: 4096,
    basePayout: 2000,
    ridePayout: 4000,
    description: 'Guess the last three hex digits (000-fff)',
  },
}
