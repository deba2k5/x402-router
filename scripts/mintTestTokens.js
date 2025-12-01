#!/usr/bin/env node

/**
 * Mint test tokens to an account for testing X402 payments
 * Usage: node scripts/mintTestTokens.js <chainName> <recipientAddress> <amount>
 * Example: node scripts/mintTestTokens.js base-sepolia 0x95Cf028D5e86863570E300CAD14484Dc2068eB79 1000
 */

const { createWalletClient, createPublicClient, http, parseUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia } = require('viem/chains');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get command line arguments
const chainName = process.argv[2] || 'base-sepolia';
const recipientAddress = process.argv[3];
const amountUSDC = process.argv[4] || '100'; // Default 100 USDC

if (!recipientAddress) {
  console.error('Usage: node mintTestTokens.js <chainName> <recipientAddress> [amount]');
  console.error('Example: node mintTestTokens.js base-sepolia 0x95Cf028D5e86863570E300CAD14484Dc2068eB79 1000');
  process.exit(1);
}

// Chain mapping
const chainMap = {
  'base-sepolia': baseSepolia,
  'sepolia': sepolia,
  'arbitrum-sepolia': arbitrumSepolia,
  'optimism-sepolia': optimismSepolia,
};

// Load token addresses from deployment files
const getTokenConfig = (chain) => {
  const deploymentFile = path.join(__dirname, `../contracts/deployments/${chain}-tokens.json`);
  try {
    const data = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
    return {
      usdc: data.tokens.MockUSDC.address,
      dai: data.tokens.MockDAI?.address,
      decimals: data.tokens.MockUSDC.decimals,
    };
  } catch (e) {
    console.error(`Failed to load token config for ${chain}:`, e.message);
    process.exit(1);
  }
};

// Mock USDC ABI (minimal - just need mint function)
const MOCK_USDC_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
];

async function mintTokens() {
  try {
    console.log(`🚀 Minting test tokens on ${chainName}`);
    console.log(`   Recipient: ${recipientAddress}`);
    console.log(`   Amount: ${amountUSDC} USDC`);

    // Validate chain
    const chain = chainMap[chainName];
    if (!chain) {
      console.error(`❌ Unsupported chain: ${chainName}`);
      console.error(`   Supported: base-sepolia, sepolia, arbitrum-sepolia, optimism-sepolia`);
      process.exit(1);
    }

    // Get token config
    const tokenConfig = getTokenConfig(chainName);
    const usdcAddress = tokenConfig.usdc;
    console.log(`\n📋 USDC Token: ${usdcAddress}`);

    // Setup account
    const privateKey = process.env.EVM_PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ EVM_PRIVATE_KEY not set in .env');
      process.exit(1);
    }

    const account = privateKeyToAccount(privateKey);
    console.log(`💼 Minter Account: ${account.address}`);

    // Setup clients
    const getRpcUrl = (chain) => {
      const rpcVars = {
        'base-sepolia': 'BASE_SEPOLIA_RPC',
        'sepolia': 'SEPOLIA_RPC',
        'arbitrum-sepolia': 'ARBITRUM_SEPOLIA_RPC',
        'optimism-sepolia': 'OPTIMISM_SEPOLIA_RPC',
      };
      return process.env[rpcVars[chain]];
    };

    const rpcUrl = getRpcUrl(chainName);
    console.log(`🌐 RPC: ${rpcUrl}`);

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    // Check balance before
    console.log(`\n⏳ Checking recipient balance...`);
    const balanceBefore = await publicClient.readContract({
      address: usdcAddress,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [recipientAddress],
    });

    const balanceBeforeFormatted = balanceBefore / (10 ** tokenConfig.decimals);
    console.log(`   Current balance: ${balanceBeforeFormatted} USDC`);

    // Mint tokens
    console.log(`\n⏳ Minting tokens...`);
    const amount = parseUnits(amountUSDC, tokenConfig.decimals);

    const txHash = await walletClient.writeContract({
      address: usdcAddress,
      abi: MOCK_USDC_ABI,
      functionName: 'mint',
      args: [recipientAddress, amount],
    });

    console.log(`   TX Hash: ${txHash}`);

    // Wait for confirmation
    console.log(`⏳ Waiting for confirmation...`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Check balance after
    console.log(`\n⏳ Checking recipient balance after mint...`);
    const balanceAfter = await publicClient.readContract({
      address: usdcAddress,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [recipientAddress],
    });

    const balanceAfterFormatted = balanceAfter / (10 ** tokenConfig.decimals);
    console.log(`   New balance: ${balanceAfterFormatted} USDC`);
    console.log(`   Added: ${amountUSDC} USDC`);

    console.log(`\n✨ Mint successful!`);
    console.log(`   Recipient: ${recipientAddress}`);
    console.log(`   Amount: ${amountUSDC} USDC`);
    console.log(`   Chain: ${chainName}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

mintTokens();
