#!/usr/bin/env node
/**
 * Hash Game Keeper - Auto-resolves pending bets
 * Run via cron every hour: 0 * * * * cd /path/to/hash-app && node scripts/keeper.js
 */

import { createPublicClient, createWalletClient, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Config
const HASH_GAME = '0xDDCE0B582F2711a18A62Ce06569C5ea2d7375445';
const DEPLOYMENT_BLOCK = 10165750n;
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

// Keeper wallet - load from env (never hardcode!)
const PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ KEEPER_PRIVATE_KEY not set. Create .env or export it.');
  process.exit(1);
}

// ABI fragments
const BET_PLACED_EVENT = parseAbiItem('event BetPlaced(uint256 indexed betId, address indexed player, uint8 mode, uint16 prediction, uint256 amount, uint256 targetBlock)');

const HASH_GAME_ABI = [
  {
    name: 'getBet',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'betId', type: 'uint256' }],
    outputs: [
      { name: 'player', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'mode', type: 'uint8' },
      { name: 'prediction', type: 'uint16' },
      { name: 'targetBlock', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'isRide', type: 'bool' },
      { name: 'payout', type: 'uint256' },
    ],
  },
  {
    name: 'resolveBet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'betId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'nextBetId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
];

const BetStatus = {
  PENDING: 0,
  WON: 1,
  LOST: 2,
  EXPIRED: 3,
  RIDING: 4,
};

async function main() {
  console.log(`[${new Date().toISOString()}] Hash Keeper starting...`);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });

  const account = privateKeyToAccount(PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
  });

  console.log(`Keeper address: ${account.address}`);

  // Get current block
  const currentBlock = await publicClient.getBlockNumber();
  console.log(`Current block: ${currentBlock}`);

  // Get total bets
  const nextBetId = await publicClient.readContract({
    address: HASH_GAME,
    abi: HASH_GAME_ABI,
    functionName: 'nextBetId',
  });
  console.log(`Total bets placed: ${nextBetId}`);

  // Check each bet (in reverse order, most recent first)
  let resolved = 0;
  let pending = 0;
  let errors = 0;

  for (let betId = nextBetId - 1n; betId >= 0n; betId--) {
    try {
      const bet = await publicClient.readContract({
        address: HASH_GAME,
        abi: HASH_GAME_ABI,
        functionName: 'getBet',
        args: [betId],
      });

      const [player, amount, mode, prediction, targetBlock, status] = bet;

      // Skip if not pending
      if (Number(status) !== BetStatus.PENDING) {
        continue;
      }

      pending++;

      // Skip if target block not yet reached
      if (currentBlock < targetBlock) {
        console.log(`Bet #${betId}: waiting for block ${targetBlock} (current: ${currentBlock})`);
        continue;
      }

      // Check if blockhash is still available (256 block limit)
      if (currentBlock > targetBlock + 256n) {
        console.log(`Bet #${betId}: EXPIRED (block ${targetBlock} too old)`);
      }

      // Resolve the bet
      console.log(`Resolving bet #${betId} (player: ${player.slice(0, 8)}..., amount: ${amount / 10n**18n} HASH, target: ${targetBlock})`);

      const hash = await walletClient.writeContract({
        address: HASH_GAME,
        abi: HASH_GAME_ABI,
        functionName: 'resolveBet',
        args: [betId],
      });

      console.log(`  TX: ${hash}`);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  Confirmed in block ${receipt.blockNumber}, status: ${receipt.status}`);

      resolved++;

      // Small delay between TXs
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      // Bet might not exist or other error
      if (!err.message?.includes('Bet not pending')) {
        console.error(`Error processing bet #${betId}:`, err.message?.slice(0, 100));
        errors++;
      }
    }

    // Stop if we've gone back too far with no pending bets
    if (betId < nextBetId - 100n && pending === 0) {
      break;
    }
  }

  console.log(`\n[${new Date().toISOString()}] Keeper finished.`);
  console.log(`  Resolved: ${resolved}`);
  console.log(`  Still pending: ${pending - resolved}`);
  console.log(`  Errors: ${errors}`);
}

main().catch(console.error);
