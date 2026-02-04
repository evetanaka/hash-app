# Auction Hash — Game Design Document

## Overview

**Auction Hash** is a weekly auction game where the highest bidder wins, but with a twist: bids must stay within a reasonable range of each other. This creates a game theory dynamic where players must guess the "market consensus" rather than simply outbid everyone.

## Core Mechanics

### Cycle
- **Duration:** 1 week (Monday 00:00 UTC → Sunday 20:00 UTC)
- **Reveal:** Sunday 20:00 UTC (automated via Chainlink Automation)

### Bidding Rules
- Players submit bids in ETH/USDC during the auction period
- Multiple bids allowed per player (only highest counts)
- Bids are visible to all participants (transparent auction)

### Winner Determination — The Consensus Rule

```
Winner = Highest bid that satisfies the Consensus Rule
Consensus Rule: gap between top bid and 2nd bid ≤ 30% of top bid value
```

**Cascade Logic:**
1. Check if top bid is valid (gap with 2nd ≤ 30%)
2. If invalid → top bid is "invalidated", check 2nd vs 3rd
3. Repeat until a valid winner is found
4. If no valid winner (edge case) → jackpot rolls over

**Example:**
```
Bids: 100, 65, 60, 55

Check 1: 100 vs 65 → gap = 35% ❌ (100 invalidated)
Check 2: 65 vs 60 → gap = 7.7% ✅ (65 wins!)
```

### Payout Structure

| Status | Receives |
|--------|----------|
| Winner | 100% of jackpot |
| Losers | 90% of their bid back |
| Invalidated | 90% of their bid back |

**10% of all losing/invalidated bids → Next week's jackpot**

### Jackpot Feeding

The jackpot grows from multiple sources:

1. **10% of losing bids** from current auction
2. **10% of invalidated bids** from current auction  
3. **10% cross-feed** from other Hash games' jackpots (Hash Game, Crash Hash, etc.)

This creates a self-sustaining ecosystem where activity anywhere feeds the Auction Hash jackpot.

## Parameters (Adjustable)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxGapPercent` | 30 | Maximum allowed gap between top and 2nd bid |
| `losersRefundPercent` | 90 | Percentage refunded to losers |
| `revealDay` | 0 (Sunday) | Day of week for reveal |
| `revealHour` | 20 | Hour (UTC) for reveal |
| `minBid` | 0.01 ETH | Minimum bid amount |

Parameters can be adjusted by admin/governance based on observed player behavior.

## Smart Contract Architecture

```
AuctionHash.sol
├── bid(uint256 amount) — Place a bid
├── reveal() — Trigger winner determination (Chainlink Automation)
├── claimWinnings() — Winner claims jackpot
├── claimRefund() — Losers/invalidated claim 90%
├── feedJackpot() — Receive cross-feed from other games
│
├── State:
│   ├── currentAuctionId
│   ├── bids mapping (auctionId → address → amount)
│   ├── jackpot
│   ├── parameters (adjustable)
│   └── auctionHistory
│
└── Events:
    ├── BidPlaced(auctionId, bidder, amount)
    ├── BidInvalidated(auctionId, bidder, amount, gap)
    ├── WinnerDetermined(auctionId, winner, amount, jackpot)
    └── JackpotFed(source, amount)
```

## Frontend Features

### Main View
- Current jackpot size (prominent)
- Time remaining until reveal
- Live bid list (sorted by amount)
- "Danger zone" indicator showing if top bid would be invalidated

### Bid Interface
- Bid input with suggested range based on current bids
- "Safe zone" calculator (what range keeps you valid)
- Bid history for current auction

### History
- Past auction results
- Winner, winning bid, invalidated bids
- Jackpot growth chart over time

### Strategy Helper
- Current bid distribution visualization
- "Consensus range" indicator
- Warning if your bid would likely be invalidated

## Game Theory Dynamics

**What makes this interesting:**

1. **No pure whale advantage** — Bidding too high gets you invalidated
2. **Information game** — You're guessing what others will bid
3. **Late bidding advantage** — More info, but less time to react
4. **Psychological warfare** — Fake-out bids, bid sniping, etc.

**Optimal strategy evolves:** As players learn, the meta shifts. The adjustable `maxGapPercent` parameter lets us tune difficulty.

## Integration with Hash Ecosystem

```
┌─────────────┐     10%      ┌──────────────┐
│  Hash Game  │ ──────────→  │              │
└─────────────┘              │              │
                             │   AUCTION    │
┌─────────────┐     10%      │    HASH      │
│ Crash Hash  │ ──────────→  │   JACKPOT    │
└─────────────┘              │              │
                             │              │
┌─────────────┐     10%      │              │
│ Future Game │ ──────────→  │              │
└─────────────┘              └──────────────┘
```

## Security Considerations

- Reveal uses future block hash (same as Hash Game) — unpredictable
- Chainlink Automation for trustless reveal timing
- Reentrancy protection on all payout functions
- Integer overflow checks (Solidity 0.8+)

## Launch Plan

1. **Phase 1:** Deploy contract on testnet, internal testing
2. **Phase 2:** Frontend development, UX testing
3. **Phase 3:** Mainnet soft launch (low max bid)
4. **Phase 4:** Full launch with cross-feed enabled

---

*Document version: 1.0*
*Last updated: 2026-02-04*
