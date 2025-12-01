#!/usr/bin/env node

/**
 * Deploy SimpleBridge contract to all supported networks
 * Usage: bun run deployBridge.ts
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia } from 'viem/chains';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY as `0x${string}`;
const RELAYER_ADDRESS = '0x95Cf028D5e86863570E300CAD14484Dc2068eB79';

// Chain configurations
const chains = [
  {
    name: 'base-sepolia',
    chain: baseSepolia,
    rpc: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
  },
  {
    name: 'sepolia',
    chain: sepolia,
    rpc: process.env.SEPOLIA_RPC || 'https://rpc.sepolia.org',
  },
  {
    name: 'arbitrum-sepolia',
    chain: arbitrumSepolia,
    rpc: process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
  },
  {
    name: 'optimism-sepolia',
    chain: optimismSepolia,
    rpc: process.env.OPTIMISM_SEPOLIA_RPC || 'https://sepolia.optimism.io',
  },
];

// SimpleBridge contract bytecode (simplified - just for reference)
const SIMPLE_BRIDGE_ABI = [
  {
    name: 'constructor',
    type: 'constructor',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_relayer', type: 'address' }],
  },
] as const;

async function deployBridge() {
  console.log('📦 Deploying SimpleBridge to all networks...\n');

  const account = privateKeyToAccount(EVM_PRIVATE_KEY);
  const deployments: Record<string, any> = {};

  for (const { name, chain, rpc } of chains) {
    try {
      console.log(`🚀 Deploying to ${name}...`);

      const publicClient = createPublicClient({
        chain,
        transport: http(rpc),
      });

      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpc),
      });

      // Note: Actual deployment would require compiled bytecode
      // For now, this is a placeholder showing the deployment flow
      
      console.log(`   Compiler: Solidity ^0.8.20`);
      console.log(`   Constructor params:`);
      console.log(`     - relayer: ${RELAYER_ADDRESS}`);
      
      // In production, would do:
      // const hash = await walletClient.deployContract({
      //   abi: SIMPLE_BRIDGE_ABI,
      //   bytecode: compiledBytecode,
      //   args: [RELAYER_ADDRESS],
      // });
      
      console.log(`   ⚠️  Requires hardhat compilation and deployment`);
      console.log(`   Run: cd contracts && npx hardhat deploy --network ${name}\n`);

      deployments[name] = {
        status: 'requires-deployment',
        network: name,
        chainId: chain.id,
        relayer: RELAYER_ADDRESS,
        message: 'Deploy using hardhat with SimpleBridge.sol',
      };
    } catch (error) {
      console.error(`   ❌ Error:`, error instanceof Error ? error.message : error);
      deployments[name] = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Save deployment info
  const outputPath = path.join(import.meta.dir, '../contracts/deployments/bridge-deployment.json');
  fs.writeFileSync(outputPath, JSON.stringify(deployments, null, 2));
  console.log(`\n✅ Deployment info saved to: contracts/deployments/bridge-deployment.json`);
  console.log(`\nNext steps:`);
  console.log(`  1. Compile SimpleBridge: npx hardhat compile`);
  console.log(`  2. Deploy: npx hardhat run scripts/deployBridge.js --network base-sepolia`);
  console.log(`  3. Update BRIDGE_ADDRESS in Facilator/index.ts with deployed addresses`);
}

deployBridge().catch(console.error);
