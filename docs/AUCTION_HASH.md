# Auction Hash — Game Design Document v2

## Overview

**Auction Hash** is a weekly sealed-bid auction game where the highest bidder wins, but with a twist: bids must stay within a reasonable range of each other (Consensus Rule). Bids are hidden until the reveal, with only aggregate bucket data visible via a heatmap.

## Core Mechanics

### Cycle
- **Duration:** 1 week (Monday 00:00 UTC → Sunday 20:00 UTC)
- **Bidding:** Monday 00:00 → Sunday 19:00 UTC (sealed bids)
- **Reveal:** Sunday 20:00 UTC (all bids revealed simultaneously)

### Sealed Bid System

**How it works:**
1. Player submits bid amount (encrypted on-chain)
2. Player's bucket is publicly recorded for the heatmap
3. Exact amounts remain hidden until reveal
4. At reveal time, all bids are decrypted and winner determined

**Buckets (for heatmap):**
```
BUCKET_0: 0 - 500 HASH
BUCKET_1: 500 - 1,000 HASH
BUCKET_2: 1,000 - 2,000 HASH
BUCKET_3: 2,000 - 5,000 HASH
BUCKET_4: 5,000 - 10,000 HASH
BUCKET_5: 10,000+ HASH
```

The bucket is automatically determined by the frontend based on bid amount.

### Heatmap Visualization

Players see aggregate distribution without exact amounts:

```
CONSENSUS HEATMAP (23 bids)

[0-500]      ░░ (2)
[500-1k]     ▓▓▓▓▓ (5)  
[1k-2k]      ▓▓▓▓▓▓▓▓▓▓▓ (11)  ← HOT ZONE
[2k-5k]      ▓▓▓▓ (4)
[5k-10k]     ░ (1)
[10k+]       (0)

Your bid: [1k-2k] bucket
```

**What players know:**
- Distribution of bids across buckets
- Which bucket they're in
- Total number of participants

**What players DON'T know:**
- Exact amounts of other bids
- Their precise ranking
- Whether they're at the top or bottom of their bucket

### Winner Determination — The Consensus Rule

```
Winner = Highest bid that satisfies the Consensus Rule
Consensus Rule: gap between top bid and 2nd bid ≤ 30% of top bid value
```

**Cascade Logic:**
1. At reveal, all bids are decrypted and sorted
2. Check if top bid is valid (gap with 2nd ≤ 30%)
3. If invalid → top bid is "invalidated", check 2nd vs 3rd
4. Repeat until a valid winner is found
5. If no valid winner (edge case) → jackpot rolls over

**Example:**
```
Revealed bids: 2100, 1500, 1420, 1380, 1200

Check 1: 2100 vs 1500 → gap = 40% ❌ (2100 invalidated)
Check 2: 1500 vs 1420 → gap = 5.6% ✅ (1500 wins!)
```

### Payout Structure

| Status | Receives |
|--------|----------|
| Winner | 100% of jackpot |
| Losers (valid bids) | 90% of their bid back |
| Invalidated (overbid) | 90% of their bid back |

**10% of all losing/invalidated bids → Next week's jackpot**

### Jackpot Feeding

The jackpot grows from multiple sources:

1. **10% of losing bids** from current auction
2. **10% of invalidated bids** from current auction  
3. **10% cross-feed** from other Hash games' jackpots

## Technical Architecture

### Encryption Scheme

Using **commit-reveal with timelock** or **threshold encryption**:

**Option A: Commit-Reveal Simplified**
```solidity
// Bidding phase
function placeBid(bytes32 commitment, uint8 bucket) external payable {
    // commitment = keccak256(abi.encodePacked(amount, secret))
    // bucket is public for heatmap
    bids[msg.sender] = Bid(commitment, bucket, msg.value);
    bucketCounts[bucket]++;
}

// Reveal phase (user reveals their own bid)
function revealBid(uint256 amount, bytes32 secret) external {
    require(block.timestamp >= revealTime);
    require(keccak256(abi.encodePacked(amount, secret)) == bids[msg.sender].commitment);
    require(getBucket(amount) == bids[msg.sender].bucket); // Bucket must match
    revealedBids[msg.sender] = amount;
}
```

**Option B: Oracle-based Sealed Bid (simpler UX)**
```solidity
// Bids encrypted with oracle's public key
function placeBid(bytes encryptedAmount, uint8 bucket) external payable {
    bids[msg.sender] = SealedBid(encryptedAmount, bucket, msg.value);
    bucketCounts[bucket]++;
}

// Oracle reveals all bids at once
function revealAllBids(
    address[] bidders,
    uint256[] amounts,
    bytes oracleSignature
) external onlyOracle {
    // Verify and process all bids
}
```

### Smart Contract Structure

```
AuctionHashSealed.sol
├── placeBid(commitment, bucket) — Place sealed bid
├── revealBid(amount, secret) — Reveal your bid (Option A)
├── finalizeAuction() — Determine winner after reveal
├── claimWinnings() — Winner claims jackpot
├── claimRefund() — Losers/invalidated claim 90%
├── feedJackpot() — Receive cross-feed from other games
│
├── View Functions:
│   ├── getBucketCounts() — For heatmap display
│   ├── getTotalBids() — Number of participants
│   ├── getJackpot() — Current prize pool
│   └── getTimeRemaining() — Until reveal
│
├── State:
│   ├── currentAuctionId
│   ├── bids mapping (address → SealedBid)
│   ├── bucketCounts[6] — For heatmap
│   ├── revealedBids mapping
│   ├── jackpot
│   └── parameters (adjustable)
│
└── Events:
    ├── BidPlaced(auctionId, bidder, bucket) // NO amount!
    ├── BidRevealed(auctionId, bidder, amount)
    ├── BidInvalidated(auctionId, bidder, amount, gap)
    ├── WinnerDetermined(auctionId, winner, amount, jackpot)
    └── JackpotFed(source, amount)
```

## Parameters (Adjustable)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxGapPercent` | 30 | Maximum allowed gap between #1 and #2 bid |
| `losersRefundPercent` | 90 | Percentage refunded to losers |
| `minBid` | 100 HASH | Minimum bid amount |
| `biddingDuration` | 6 days 19h | Time for placing bids |
| `revealDuration` | 5 hours | Time window for reveals (Option A) |
| `revealDay` | 0 (Sunday) | Day of week for reveal |
| `revealHour` | 20 | Hour (UTC) for reveal |

## Frontend Features

### Main View
- **Jackpot display** (prominent, animated)
- **Countdown timer** to reveal
- **Heatmap visualization** showing bucket distribution
- **Bid input** with automatic bucket indicator
- **Your position** shown as bucket (not exact rank)

### Bid Interface
```
┌─────────────────────────────────────────┐
│  YOUR BID                               │
│  ┌─────────────────────────────────┐    │
│  │ 1,500                    HASH   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  📊 You'll be in bucket [1k-2k]         │
│  🔥 This is currently the HOT ZONE      │
│                                         │
│  ⚠️  Your exact amount stays hidden     │
│      until Sunday 20:00 UTC             │
│                                         │
│  [████████ PLACE SEALED BID ████████]   │
└─────────────────────────────────────────┘
```

### Heatmap Component
```
┌─────────────────────────────────────────┐
│  CONSENSUS HEATMAP          23 bidders  │
│                                         │
│  [0-500]    ░░                     8%   │
│  [500-1k]   ▓▓▓▓░                 22%   │
│  [1k-2k]    ▓▓▓▓▓▓▓▓▓░      ←YOU 48%   │
│  [2k-5k]    ▓▓▓░                  17%   │
│  [5k+]      ░                      4%   │
│                                         │
│  💡 Most competition in 1k-2k range     │
└─────────────────────────────────────────┘
```

### Post-Reveal View
- Full bid list with amounts revealed
- Cascade visualization (invalidated bids struck through)
- Winner announcement
- Claim buttons for winner/losers

## Game Theory Dynamics

**Strategic considerations:**

1. **Bucket positioning** — You see where competition clusters but not exact amounts
2. **Risk/reward in bucket** — Bidding at top of bucket is safer but more expensive
3. **Hot zone danger** — Popular buckets mean more competition within the bucket
4. **Empty bucket opportunity** — Few bids in a bucket might mean easy win... or trap
5. **Overbid risk** — Going to a higher bucket risks being >30% above

**The uncertainty creates real strategy:**
- You might bid 1,900 thinking you're safe in [1k-2k]
- But 5 others also bid 1,800-1,950
- The winner is whoever threaded the needle

## Security Considerations

- Bids encrypted/committed → no front-running exact amounts
- Bucket reveals aggregate only → maintains strategic uncertainty
- Reveal phase → trustless verification of all bids
- Chainlink Automation → trustless timing of reveal
- If using oracle → multi-sig or threshold scheme

## Migration Path

1. **Phase 1:** Deploy with commit-reveal (users reveal own bids)
2. **Phase 2:** Add oracle-based sealed bids (better UX)
3. **Phase 3:** Threshold encryption (fully trustless)

---

*Document version: 2.0 — Sealed Bid + Heatmap*
*Last updated: 2026-02-04*
