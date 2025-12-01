/* eslint-env node */
/**
 * Mint test tokens to an account for testing X402 payments
 * Usage: bun run mintTestTokens.ts <chainName> <recipientAddress> [amount]
 * Example: bun run mintTestTokens.ts base-sepolia 0x95Cf028D5e86863570E300CAD14484Dc2068eB79 1000
 */

import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia } from 'viem/chains';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config();

// Get command line arguments
const chainName = process.argv[2] || 'base-sepolia';
const recipientAddress = process.argv[3];
const amountUSDC = process.argv[4] || '100'; // Default 100 USDC

if (!recipientAddress) {
  console.error('Usage: bun run mintTestTokens.ts <chainName> <recipientAddress> [amount]');
  console.error('Example: bun run mintTestTokens.ts base-sepolia 0x95Cf028D5e86863570E300CAD14484Dc2068eB79 1000');
  process.exit(1);
}

// Chain mapping
const chainMap: Record<string, any> = {
  'base-sepolia': baseSepolia,
  'sepolia': sepolia,
  'arbitrum-sepolia': arbitrumSepolia,
  'optimism-sepolia': optimismSepolia,
};

// Map chain names to deployment file names
const deploymentFileMap: Record<string, string> = {
  'base-sepolia': 'baseSepolia',
  'sepolia': 'sepolia',
  'arbitrum-sepolia': 'arbitrumSepolia',
  'optimism-sepolia': 'optimismSepolia',
};

// Load token addresses from deployment files
const getTokenConfig = (chain: string) => {
  const deploymentName = deploymentFileMap[chain];
  if (!deploymentName) {
    console.error(`❌ Unknown chain: ${chain}`);
    process.exit(1);
  }

  const deploymentFile = path.join(
    import.meta.dir,
    `../contracts/deployments/${deploymentName}-tokens.json`
  );

  try {
    const data = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
    return {
      usdc: data.tokens.MockUSDC.address,
      dai: data.tokens.MockDAI?.address,
      decimals: data.tokens.MockUSDC.decimals,
    };
  } catch (e) {
    console.error(`❌ Failed to load token config:`, (e as any).message);
    console.error(`   Tried: ${deploymentFile}`);
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
] as const;

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
    const usdcAddress = tokenConfig.usdc as `0x${string}`;
    console.log(`\n📋 USDC Token: ${usdcAddress}`);

    // Setup account
    const privateKey = process.env.EVM_PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ EVM_PRIVATE_KEY not set in .env');
      process.exit(1);
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    console.log(`💼 Minter Account: ${account.address}`);

    // Setup clients
    const rpcUrlMap: Record<string, string> = {
      'base-sepolia': process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
      'sepolia': process.env.SEPOLIA_RPC || 'https://rpc.sepolia.org',
      'arbitrum-sepolia': process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
      'optimism-sepolia': process.env.OPTIMISM_SEPOLIA_RPC || 'https://sepolia.optimism.io',
    };

    const rpcUrl = rpcUrlMap[chainName];
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
      ] as const,
      functionName: 'balanceOf',
      args: [recipientAddress as `0x${string}`],
    });

    const balanceBeforeFormatted = Number(balanceBefore) / (10 ** tokenConfig.decimals);
    console.log(`   Current balance: ${balanceBeforeFormatted} USDC`);

    // Mint tokens
    console.log(`\n⏳ Minting tokens...`);
    const amount = parseUnits(amountUSDC, tokenConfig.decimals);

    const txHash = await walletClient.writeContract({
      address: usdcAddress,
      abi: MOCK_USDC_ABI,
      functionName: 'mint',
      chain,
      args: [recipientAddress as `0x${string}`, amount],
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
      ] as const,
      functionName: 'balanceOf',
      args: [recipientAddress as `0x${string}`],
    });

    const balanceAfterFormatted = Number(balanceAfter) / (10 ** tokenConfig.decimals);
    console.log(`   New balance: ${balanceAfterFormatted} USDC`);
    console.log(`   Added: ${amountUSDC} USDC`);

    console.log(`\n✨ Mint successful!`);
    console.log(`   Recipient: ${recipientAddress}`);
    console.log(`   Amount: ${amountUSDC} USDC`);
    console.log(`   Chain: ${chainName}`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    console.error(error);
    process.exit(1);
  }
}

mintTokens();
