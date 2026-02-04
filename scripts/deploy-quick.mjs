import { createWalletClient, createPublicClient, http, parseEther, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });

const balance = await publicClient.getBalance({ address: account.address });
console.log('Account:', account.address);
console.log('Balance:', Number(balance) / 1e18, 'ETH');

if (balance < parseEther('0.01')) {
  console.log('\n❌ Need more ETH. Get from: https://www.alchemy.com/faucets/ethereum-sepolia');
} else {
  console.log('\n✅ Ready to deploy!');
}
