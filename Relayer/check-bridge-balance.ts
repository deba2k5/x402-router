#!/usr/bin/env bun

/**
 * Check token balances in SimpleBridge contracts
 * 
 * Usage:
 *   bun run check-bridge-balance.ts
 */

import { createPublicClient, http, type Address, type Chain, formatUnits } from 'viem';
import { baseSepolia, arbitrumSepolia, optimismSepolia } from 'viem/chains';
import { config } from 'dotenv';

config();

const BRIDGE_ADDRESSES: Record<number, Address> = {
  84532: (process.env.BASE_SEPOLIA_BRIDGE || '0x9777F502DdAB647A54A1552673D123bB199B4b5e') as Address,
  421614: (process.env.ARBITRUM_SEPOLIA_BRIDGE || '0x9b9a721933038D4c85F3330e8B4f8CFC5a3F31CA') as Address,
  11155420: (process.env.OPTIMISM_SEPOLIA_BRIDGE || '0x404A674a52f85789a71D530af705f2f458bc5284') as Address,
};

type TokenConfig = {
  symbol: string;
  address: Address;
  decimals: number;
};

type ChainConfig = {
  chainId: number;
  name: string;
  rpcUrl: string;
  chain: Chain;
  tokens: TokenConfig[];
};

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  84532: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    chain: baseSepolia,
    tokens: [
      { symbol: 'USDC', address: '0x2b23c6e36b46cC013158Bc2869D686023FA85422' as Address, decimals: 6 },
      { symbol: 'DAI', address: '0x6eb198E04d9a6844F74FC099d35b292127656A3F' as Address, decimals: 18 },
    ],
  },
  421614: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
    chain: arbitrumSepolia,
    tokens: [
      { symbol: 'USDC', address: '0x7b926C6038a23c3E26F7f36DcBec7606BAF44434' as Address, decimals: 6 },
      { symbol: 'DAI', address: '0xeeC4119F3B69A61744073BdaEd83421F4b29961E' as Address, decimals: 18 },
    ],
  },
  11155420: {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC || 'https://sepolia.optimism.io',
    chain: optimismSepolia,
    tokens: [
      { symbol: 'USDC', address: '0x281Ae468d00040BCbB4685972F51f87d473420F7' as Address, decimals: 6 },
      { symbol: 'DAI', address: '0x7b926C6038a23c3E26F7f36DcBec7606BAF44434' as Address, decimals: 18 },
    ],
  },
};

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

async function checkBridgeBalance(chainId: number) {
  const config = CHAIN_CONFIGS[chainId];
  const bridgeAddress = BRIDGE_ADDRESSES[chainId];

  if (!config || !bridgeAddress) {
    return;
  }

  console.log(`\n💰 ${config.name}`);
  console.log(`   Bridge: ${bridgeAddress}`);

  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl, { timeout: 20000 }),
  });

  try {
    // Check if contract exists
    const bytecode = await publicClient.getBytecode({ address: bridgeAddress });
    if (!bytecode || bytecode === '0x') {
      console.log(`   ⚠️  No contract deployed`);
      return;
    }

    let hasBalance = false;

    for (const token of config.tokens) {
      try {
        const balance = await publicClient.readContract({
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [bridgeAddress],
        });

        const formatted = formatUnits(balance, token.decimals);
        
        if (balance > 0n) {
          console.log(`   ✅ ${token.symbol}: ${formatted}`);
          hasBalance = true;
        } else {
          console.log(`   ⚠️  ${token.symbol}: 0 (bridge needs tokens to complete transfers)`);
        }
      } catch (e) {
        console.log(`   ❌ ${token.symbol}: Error checking balance`);
      }
    }

    if (!hasBalance) {
      console.log(`   💡 Bridge has no tokens! It needs tokens to release on destination chain.`);
      console.log(`   💡 To fund: Send tokens directly to bridge address ${bridgeAddress}`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  console.log('💰 SimpleBridge Token Balance Checker\n');
  console.log('Checking token balances in bridge contracts...\n');

  for (const chainId of Object.keys(CHAIN_CONFIGS).map(Number)) {
    await checkBridgeBalance(chainId);
  }

  console.log('\n\n💡 Note: Bridges need to hold tokens on destination chains to complete transfers.');
  console.log('   If a bridge has 0 balance, send tokens to the bridge address to fund it.');
}

main().catch(console.error);
