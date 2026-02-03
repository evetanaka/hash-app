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
    inputs: [],
    name: "getRespinConfig",
    outputs: [
      {
        components: [
          { name: "cellCostBps", type: "uint256" },
          { name: "lineCostBps", type: "uint256" },
          { name: "windowBlocks", type: "uint256" }
        ],
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "player", type: "address" }],
    name: "canRespin",
    outputs: [
      { name: "eligible", type: "bool" },
      { name: "originalSpinId", type: "uint256" },
      { name: "originalGrid", type: "uint8[9]" },
      { name: "blocksRemaining", type: "uint256" },
      { name: "cellCost", type: "uint256" },
      { name: "lineCost", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "lineIndex", type: "uint8" }],
    name: "getLineIndices",
    outputs: [{ type: "uint8[3]" }],
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
  {
    inputs: [{ name: "cellIndex", type: "uint8" }],
    name: "lockCellAndRespin",
    outputs: [
      { name: "newSpinId", type: "uint256" },
      { name: "newGrid", type: "uint8[9]" },
      { name: "maxMatch", type: "uint8" },
      { name: "linesHit", type: "uint8" },
      { name: "payout", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "lineIndex", type: "uint8" }],
    name: "lockLineAndRespin",
    outputs: [
      { name: "newSpinId", type: "uint256" },
      { name: "newGrid", type: "uint8[9]" },
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
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "originalSpinId", type: "uint256" },
      { indexed: true, name: "newSpinId", type: "uint256" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "lockedCell", type: "uint8" },
      { indexed: false, name: "cost", type: "uint256" },
      { indexed: false, name: "newGrid", type: "uint8[9]" },
      { indexed: false, name: "maxMatch", type: "uint8" },
      { indexed: false, name: "linesHit", type: "uint8" },
      { indexed: false, name: "payout", type: "uint256" }
    ],
    name: "CellRespin",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "originalSpinId", type: "uint256" },
      { indexed: true, name: "newSpinId", type: "uint256" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "lockedLine", type: "uint8" },
      { indexed: false, name: "cost", type: "uint256" },
      { indexed: false, name: "newGrid", type: "uint8[9]" },
      { indexed: false, name: "maxMatch", type: "uint8" },
      { indexed: false, name: "linesHit", type: "uint8" },
      { indexed: false, name: "payout", type: "uint256" }
    ],
    name: "LineRespin",
    type: "event"
  }
] as const
