/**
 * Deployment script for AuctionHash contract
 * 
 * Usage:
 *   PRIVATE_KEY=0x... npx hardhat run scripts/deploy-auction.js --network sepolia
 * 
 * Or with Foundry:
 *   forge script scripts/deploy-auction.s.sol --rpc-url $SEPOLIA_RPC --broadcast
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying AuctionHash with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Contract addresses (update for your network)
  const HASH_TOKEN = "0xeF4796fb608AF39c9dB4FC1903ed1c880C4d9b8F"; // Sepolia
  const INITIAL_JACKPOT = hre.ethers.utils.parseEther("10000"); // 10,000 HASH

  // Deploy AuctionHash
  const AuctionHash = await hre.ethers.getContractFactory("AuctionHash");
  const auction = await AuctionHash.deploy(HASH_TOKEN, INITIAL_JACKPOT);
  
  await auction.deployed();
  
  console.log("AuctionHash deployed to:", auction.address);
  console.log("");
  console.log("Next steps:");
  console.log("1. Update CONTRACTS.auctionHash in src/config/wagmi.ts");
  console.log("2. Approve HASH tokens for the contract");
  console.log("3. Seed initial jackpot with seedJackpot()");
  console.log("4. Set up Chainlink Automation for reveal");
  console.log("");
  console.log("Verification command:");
  console.log(`npx hardhat verify --network sepolia ${auction.address} "${HASH_TOKEN}" "${INITIAL_JACKPOT}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
