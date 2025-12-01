#!/usr/bin/env bun

/**
 * Check and optionally set relayer address on SimpleBridge contracts
 * 
 * Usage:
 *   bun run check-relayer.ts              # Check current relayer
 *   bun run check-relayer.ts --set        # Set relayer to EVM_PRIVATE_KEY account
 */

import { createPublicClient, createWalletClient, http, type Address, type Chain } from 'viem';
import { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';

config();

const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY as `0x${string}`;
const RELAYER_ACCOUNT = privateKeyToAccount(EVM_PRIVATE_KEY);

const BRIDGE_ADDRESSES: Record<number, Address> = {
  84532: (process.env.BASE_SEPOLIA_BRIDGE || '0x9777F502DdAB647A54A1552673D123bB199B4b5e') as Address,
  11155111: (process.env.SEPOLIA_BRIDGE || '0x560f65Ca2d08bF995c57726eC83f7de29F5B2C38') as Address,
  421614: (process.env.ARBITRUM_SEPOLIA_BRIDGE || '0x9b9a721933038D4c85F3330e8B4f8CFC5a3F31CA') as Address,
  11155420: (process.env.OPTIMISM_SEPOLIA_BRIDGE || '0x404A674a52f85789a71D530af705f2f458bc5284') as Address,
};

type ChainConfig = {
  chainId: number;
  name: string;
  rpcUrl: string;
  chain: Chain;
};

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  84532: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    chain: baseSepolia,
  },
  11155111: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC || 'https://rpc.sepolia.org',
    chain: sepolia,
  },
  421614: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
    chain: arbitrumSepolia,
  },
  11155420: {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC || 'https://sepolia.optimism.io',
    chain: optimismSepolia,
  },
};

const SIMPLE_BRIDGE_ABI = [
  {
    name: 'relayer',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'setRelayer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_newRelayer', type: 'address' }],
    outputs: [],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

async function checkRelayer(chainId: number) {
  const config = CHAIN_CONFIGS[chainId];
  const bridgeAddress = BRIDGE_ADDRESSES[chainId];

  if (!config || !bridgeAddress) {
    console.log(`⏭️  Skipping chain ${chainId} (not configured)`);
    return null;
  }

  console.log(`\n🔍 Checking ${config.name}...`);
  console.log(`   Bridge: ${bridgeAddress}`);

  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl, { timeout: 20000 }),
  });

  try {
    // Check if contract exists
    const bytecode = await publicClient.getBytecode({ address: bridgeAddress });
    if (!bytecode || bytecode === '0x') {
      console.log(`   ⚠️  No contract deployed at this address`);
      return null;
    }

    // Get current relayer
    const currentRelayer = await publicClient.readContract({
      address: bridgeAddress,
      abi: SIMPLE_BRIDGE_ABI,
      functionName: 'relayer',
    });

    console.log(`   Current relayer: ${currentRelayer}`);
    console.log(`   Your address:    ${RELAYER_ACCOUNT.address}`);

    if (currentRelayer.toLowerCase() === RELAYER_ACCOUNT.address.toLowerCase()) {
      console.log(`   ✅ Relayer is correctly set!`);
      return { correct: true, currentRelayer };
    } else {
      console.log(`   ❌ Relayer mismatch!`);
      
      // Check owner
      try {
        const owner = await publicClient.readContract({
          address: bridgeAddress,
          abi: SIMPLE_BRIDGE_ABI,
          functionName: 'owner',
        });
        console.log(`   Contract owner: ${owner}`);
        
        if (owner.toLowerCase() === RELAYER_ACCOUNT.address.toLowerCase()) {
          console.log(`   💡 You are the owner - can call setRelayer()`);
          return { correct: false, currentRelayer, canSet: true, chainId };
        } else {
          console.log(`   ⚠️  You are not the owner - cannot set relayer`);
          return { correct: false, currentRelayer, canSet: false };
        }
      } catch (e) {
        console.log(`   ⚠️  Could not check owner`);
        return { correct: false, currentRelayer, canSet: false };
      }
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function setRelayer(chainId: number) {
  const config = CHAIN_CONFIGS[chainId];
  const bridgeAddress = BRIDGE_ADDRESSES[chainId];

  console.log(`\n🔧 Setting relayer on ${config.name}...`);

  const walletClient = createWalletClient({
    account: RELAYER_ACCOUNT,
    chain: config.chain,
    transport: http(config.rpcUrl, { timeout: 20000 }),
  });

  try {
    const txHash = await walletClient.writeContract({
      address: bridgeAddress,
      abi: SIMPLE_BRIDGE_ABI,
      functionName: 'setRelayer',
      args: [RELAYER_ACCOUNT.address],
    });

    console.log(`   ✅ Transaction sent: ${txHash}`);
    console.log(`   Waiting for confirmation...`);

    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl, { timeout: 20000 }),
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`   ✅ Relayer updated successfully!`);
  } catch (error) {
    console.error(`   ❌ Failed:`, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  const shouldSet = process.argv.includes('--set');

  console.log('🔍 SimpleBridge Relayer Checker\n');
  console.log(`Your relayer address: ${RELAYER_ACCOUNT.address}\n`);

  const chainsToFix: number[] = [];

  // Check all chains
  for (const chainId of Object.keys(CHAIN_CONFIGS).map(Number)) {
    const result = await checkRelayer(chainId);
    if (result && !result.correct && result.canSet) {
      chainsToFix.push(chainId);
    }
  }

  // Set relayer if requested
  if (shouldSet && chainsToFix.length > 0) {
    console.log('\n\n🔧 Setting relayer on chains that need it...\n');
    for (const chainId of chainsToFix) {
      await setRelayer(chainId);
    }
  } else if (chainsToFix.length > 0) {
    console.log('\n\n💡 To fix the relayer address, run:');
    console.log('   bun run check-relayer.ts --set');
  } else {
    console.log('\n\n✅ All relayers are correctly configured!');
  }
}

main().catch(console.error);
