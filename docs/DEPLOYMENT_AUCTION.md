# Auction Hash Deployment Guide

## Prerequisites

1. **Node.js 18+** installed
2. **Foundry** (recommended) or **Hardhat**
3. **Sepolia ETH** for gas
4. **HASH tokens** for initial jackpot seeding

## Contract Dependencies

Install OpenZeppelin and Chainlink contracts:

```bash
npm install @openzeppelin/contracts @chainlink/contracts
# or with Foundry
forge install OpenZeppelin/openzeppelin-contracts
forge install smartcontractkit/chainlink
```

## Deployment Steps

### 1. Deploy the Contract

**With Foundry:**
```bash
forge create contracts/AuctionHash.sol:AuctionHash \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $HASH_TOKEN_ADDRESS 0 \
  --verify
```

**With Hardhat:**
```bash
PRIVATE_KEY=0x... npx hardhat run scripts/deploy-auction.js --network sepolia
```

### 2. Update Frontend Config

Edit `src/config/wagmi.ts`:
```typescript
auctionHash: '0xYOUR_DEPLOYED_ADDRESS' as `0x${string}`,
```

### 3. Seed Initial Jackpot

```javascript
// Approve tokens first
await hashToken.approve(auctionHashAddress, initialJackpot);

// Seed jackpot
await auctionHash.seedJackpot(ethers.utils.parseEther("10000"));
```

### 4. Set Up Chainlink Automation

1. Go to [Chainlink Automation](https://automation.chain.link/)
2. Register new Upkeep
3. Select "Custom logic"
4. Enter AuctionHash contract address
5. Fund with LINK tokens
6. The contract's `checkUpkeep` and `performUpkeep` will handle automatic reveals

### 5. Authorize Cross-Feed Sources

If other games will feed the jackpot:

```javascript
// Authorize HashGame to feed jackpot
await auctionHash.setAuthorizedFeeder(hashGameAddress, true);

// Authorize CyberSlots to feed jackpot
await auctionHash.setAuthorizedFeeder(cyberSlotsAddress, true);
```

## Contract Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxGapPercent` | 30 | Max gap % between #1 and #2 bid |
| `losersRefundPercent` | 90 | % refunded to losers |
| `minBid` | 1 HASH | Minimum bid amount |
| `auctionDuration` | 7 days | Time between reveals |
| `revealDay` | 0 (Sunday) | Day of week for reveal |
| `revealHour` | 20 | Hour (UTC) for reveal |

Adjust with owner functions:
```javascript
await auctionHash.setMaxGapPercent(40); // 40% gap allowed
await auctionHash.setLosersRefundPercent(85); // 85% refund
```

## Testing

Run Foundry tests:
```bash
# Install forge-std
forge install foundry-rs/forge-std

# Run tests
forge test -vvv

# Run specific test
forge test --match-test test_ConsensusRule -vvv
```

## Verification

```bash
# Etherscan verification
forge verify-contract $CONTRACT_ADDRESS contracts/AuctionHash.sol:AuctionHash \
  --chain sepolia \
  --constructor-args $(cast abi-encode "constructor(address,uint256)" $HASH_TOKEN 0)
```

## Security Considerations

1. **Owner keys**: Use multisig for mainnet deployment
2. **Initial jackpot**: Don't seed too much initially
3. **Parameter changes**: Announce before adjusting maxGapPercent
4. **Cross-feed**: Only authorize verified game contracts

## Monitoring

Key events to monitor:
- `BidPlaced` - New bids
- `BidInvalidated` - Overbids getting invalidated
- `WinnerDetermined` - Auction results
- `JackpotFed` - Cross-feed contributions

## Mainnet Checklist

- [ ] Audit completed
- [ ] Test on Sepolia
- [ ] Multisig ownership
- [ ] Chainlink Automation funded
- [ ] Frontend pointing to correct address
- [ ] Initial jackpot seeded
- [ ] Cross-feed contracts authorized
- [ ] Documentation updated
