export const CyberSlotsABI = [
  // Read functions
  {
    inputs: [],
    name: "minBet",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "jackpotPool",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalSpins",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalWagered",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalPaidOut",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalBurned",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "tier", type: "uint8" }],
    name: "tierMaxBet",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getStats",
    outputs: [
      { name: "_totalSpins", type: "uint256" },
      { name: "_totalWagered", type: "uint256" },
      { name: "_totalPaidOut", type: "uint256" },
      { name: "_totalBurned", type: "uint256" },
      { name: "_jackpotPool", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "player", type: "address" },
      { name: "limit", type: "uint256" },
      { name: "offset", type: "uint256" }
    ],
    name: "getPlayerSpins",
    outputs: [
      {
        components: [
          { name: "player", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "result", type: "uint8[3]" },
          { name: "winType", type: "uint8" },
          { name: "payout", type: "uint256" },
          { name: "timestamp", type: "uint256" }
        ],
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Write functions
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "spin",
    outputs: [
      { name: "spinId", type: "uint256" },
      { name: "result", type: "uint8[3]" },
      { name: "winType", type: "uint8" },
      { name: "payout", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "lockReel0", type: "bool" },
      { name: "lockReel1", type: "bool" },
      { name: "lockReel2", type: "bool" }
    ],
    name: "lockAndRespin",
    outputs: [
      { name: "newSpinId", type: "uint256" },
      { name: "newResult", type: "uint8[3]" },
      { name: "winType", type: "uint8" },
      { name: "payout", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  // View functions for respin
  {
    inputs: [{ name: "player", type: "address" }],
    name: "canRespin",
    outputs: [
      { name: "eligible", type: "bool" },
      { name: "originalSpinId", type: "uint256" },
      { name: "originalResult", type: "uint8[3]" },
      { name: "blocksRemaining", type: "uint256" },
      { name: "cost1Lock", type: "uint256" },
      { name: "cost2Lock", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "spinId", type: "uint256" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "result", type: "uint8[3]" },
      { indexed: false, name: "winType", type: "uint8" },
      { indexed: false, name: "payout", type: "uint256" }
    ],
    name: "SpinCompleted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "spinId", type: "uint256" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "JackpotWon",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "originalSpinId", type: "uint256" },
      { indexed: true, name: "newSpinId", type: "uint256" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "lockMask", type: "uint8" },
      { indexed: false, name: "extraCost", type: "uint256" },
      { indexed: false, name: "newResult", type: "uint8[3]" },
      { indexed: false, name: "winType", type: "uint8" },
      { indexed: false, name: "payout", type: "uint256" }
    ],
    name: "Respin",
    type: "event"
  }
] as const
