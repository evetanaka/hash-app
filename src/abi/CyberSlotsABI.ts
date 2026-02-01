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
    inputs: [{ name: "player", type: "address" }],
    name: "playerPendingSpinId",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "spinId", type: "uint256" }],
    name: "spins",
    outputs: [
      { name: "player", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "targetBlock", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "result", type: "uint8[3]" },
      { name: "winType", type: "uint8" },
      { name: "payout", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "spinId", type: "uint256" }],
    name: "canResolve",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "player", type: "address" }],
    name: "getPendingSpin",
    outputs: [
      {
        components: [
          { name: "player", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "targetBlock", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "result", type: "uint8[3]" },
          { name: "winType", type: "uint8" },
          { name: "payout", type: "uint256" }
        ],
        type: "tuple"
      }
    ],
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
  // Write functions
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "spin",
    outputs: [{ name: "spinId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "spinId", type: "uint256" }],
    name: "resolve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "spinId", type: "uint256" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "targetBlock", type: "uint256" }
    ],
    name: "SpinPlaced",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "spinId", type: "uint256" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "result", type: "uint8[3]" },
      { indexed: false, name: "winType", type: "uint8" },
      { indexed: false, name: "payout", type: "uint256" }
    ],
    name: "SpinResolved",
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
  }
] as const
