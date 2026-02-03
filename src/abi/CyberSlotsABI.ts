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
    name: "getJackpotPool",
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
    inputs: [],
    name: "getPayouts",
    outputs: [
      {
        components: [
          { name: "match3", type: "uint256" },
          { name: "match4", type: "uint256" },
          { name: "match5", type: "uint256" },
          { name: "match6", type: "uint256" },
          { name: "match7", type: "uint256" },
          { name: "match8", type: "uint256" },
          { name: "line3", type: "uint256" }
        ],
        name: "",
        type: "tuple"
      }
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
          { name: "grid", type: "uint8[9]" },
          { name: "maxMatch", type: "uint8" },
          { name: "linesHit", type: "uint8" },
          { name: "isJackpot", type: "bool" },
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
  {
    inputs: [{ name: "hash", type: "bytes32" }],
    name: "previewGrid",
    outputs: [{ type: "uint8[9]" }],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [{ name: "grid", type: "uint8[9]" }],
    name: "analyzeGrid",
    outputs: [
      { name: "maxMatch", type: "uint8" },
      { name: "linesHit", type: "uint8" },
      { name: "isJackpot", type: "bool" }
    ],
    stateMutability: "pure",
    type: "function"
  },
  // Write functions
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "spin",
    outputs: [
      { name: "spinId", type: "uint256" },
      { name: "grid", type: "uint8[9]" },
      { name: "maxMatch", type: "uint8" },
      { name: "linesHit", type: "uint8" },
      { name: "payout", type: "uint256" }
    ],
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
      { indexed: false, name: "grid", type: "uint8[9]" },
      { indexed: false, name: "maxMatch", type: "uint8" },
      { indexed: false, name: "linesHit", type: "uint8" },
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
  }
] as const
