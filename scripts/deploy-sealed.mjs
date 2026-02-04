/**
 * Deploy AuctionHashSealed contract to Sepolia
 * Usage: node scripts/deploy-sealed.mjs
 */

import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || process.env.PRIVATE_KEY;
const HASH_TOKEN = '0xeF4796fb608AF39c9dB4FC1903ed1c880C4d9b8F'; // Sepolia HASH token
const INITIAL_JACKPOT = 0n; // Start with 0, seed later
const RPC_URL = 'https://rpc.sepolia.org';

if (!PRIVATE_KEY) {
  console.error('❌ Missing KEEPER_PRIVATE_KEY or PRIVATE_KEY env var');
  process.exit(1);
}

async function compileContract() {
  console.log('📦 Compiling AuctionHashSealed.sol...');
  
  const contractPath = path.join(__dirname, '..', 'contracts', 'AuctionHashSealed.sol');
  const nodeModules = path.join(__dirname, '..', 'node_modules');
  
  // Use solcjs to compile
  try {
    // Create a flattened version or use remappings
    const cmd = `solcjs --bin --abi --optimize --base-path . --include-path ${nodeModules} ${contractPath} -o ./artifacts 2>&1`;
    execSync(cmd, { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    
    // Read the compiled output
    const artifactsDir = path.join(__dirname, '..', 'artifacts');
    const files = execSync(`ls ${artifactsDir}`).toString().trim().split('\n');
    
    const binFile = files.find(f => f.includes('AuctionHashSealed') && f.endsWith('.bin'));
    const abiFile = files.find(f => f.includes('AuctionHashSealed') && f.endsWith('.abi'));
    
    if (!binFile || !abiFile) {
      throw new Error('Compiled files not found');
    }
    
    const bytecode = '0x' + readFileSync(path.join(artifactsDir, binFile), 'utf8');
    const abi = JSON.parse(readFileSync(path.join(artifactsDir, abiFile), 'utf8'));
    
    console.log('✅ Compilation successful');
    return { bytecode, abi };
  } catch (error) {
    console.error('❌ Compilation failed:', error.message);
    
    // Fallback: use pre-compiled bytecode if available
    console.log('🔄 Trying alternative compilation method...');
    throw error;
  }
}

async function deployWithBytecode(bytecode, abi) {
  const account = privateKeyToAccount(PRIVATE_KEY);
  
  console.log(`\n🔑 Deploying with account: ${account.address}`);
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
  });
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Account balance: ${Number(balance) / 1e18} ETH`);
  
  if (balance < parseEther('0.01')) {
    console.error('❌ Insufficient balance. Need at least 0.01 ETH for deployment.');
    process.exit(1);
  }
  
  console.log('\n🚀 Deploying AuctionHashSealed...');
  console.log(`   HASH Token: ${HASH_TOKEN}`);
  console.log(`   Initial Jackpot: ${INITIAL_JACKPOT}`);
  
  // Deploy
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [HASH_TOKEN, INITIAL_JACKPOT],
  });
  
  console.log(`\n⏳ Transaction sent: ${hash}`);
  console.log('   Waiting for confirmation...');
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'success') {
    console.log(`\n✅ Contract deployed!`);
    console.log(`📍 Address: ${receipt.contractAddress}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Update CONTRACTS.auctionHash in src/config/wagmi.ts`);
    console.log(`   2. Seed jackpot with seedJackpot()`);
    console.log(`   3. Authorize cross-feed from other games`);
    return receipt.contractAddress;
  } else {
    console.error('❌ Deployment failed');
    process.exit(1);
  }
}

// Alternative: deploy using a simpler contract first to test
async function deploySimple() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
  });
  
  console.log(`\n🔑 Account: ${account.address}`);
  
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Balance: ${Number(balance) / 1e18} ETH`);
  
  if (balance < parseEther('0.001')) {
    console.error('❌ Need ETH for gas. Get some from https://sepoliafaucet.com');
    process.exit(1);
  }
  
  console.log('\n✅ Account ready for deployment');
  console.log('\n📋 To deploy via Remix:');
  console.log('   1. Go to https://remix.ethereum.org');
  console.log('   2. Create new file: AuctionHashSealed.sol');
  console.log('   3. Paste contract code');
  console.log('   4. Compile with Solidity 0.8.20');
  console.log('   5. Deploy with:');
  console.log(`      - _hashToken: ${HASH_TOKEN}`);
  console.log(`      - _initialJackpot: 0`);
  console.log('   6. Copy deployed address to wagmi.ts');
  
  return null;
}

async function main() {
  console.log('🎯 AuctionHashSealed Deployment Script\n');
  
  try {
    const { bytecode, abi } = await compileContract();
    await deployWithBytecode(bytecode, abi);
  } catch (error) {
    console.log('\n⚠️  Direct compilation failed. Checking account...\n');
    await deploySimple();
  }
}

main().catch(console.error);
