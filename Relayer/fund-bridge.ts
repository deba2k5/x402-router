#!/usr/bin/env bun

/**
 * Fund SimpleBridge contracts with tokens
 * 
 * Usage:
 *   bun run fund-bridge.ts <chainId> <token> <amount>
 *   
 * Example:
 *   bun run fund-bridge.ts 421614 USDC 10
 */

import { createPublicClient, createWalletClient, http, type Address, type Chain, parseUnits } from 'viem';
import { baseSepolia, arbitrumSepolia, optimismSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';

config();

const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY as `0x${string}`;
const ACCOUNT = privateKeyToAccount(EVM_PRIVATE_KEY);

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
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

async function fundBridge(chainId: number, tokenSymbol: string, amount: string) {
  const config = CHAIN_CONFIGS[chainId];
  const bridgeAddress = BRIDGE_ADDRESSES[chainId];

  if (!config || !bridgeAddress) {
    console.error(`❌ Unknown chain ID: ${chainId}`);
    return;
  }

  const token = config.tokens.find(t => t.symbol.toUpperCase() === tokenSymbol.toUpperCase());
  if (!token) {
    console.error(`❌ Unknown token: ${tokenSymbol} on ${config.name}`);
    console.log(`   Available: ${config.tokens.map(t => t.symbol).join(', ')}`);
    return;
  }

  console.log(`\n💰 Funding Bridge on ${config.name}`);
  console.log(`   Bridge: ${bridgeAddress}`);
  console.log(`   Token: ${token.symbol} (${token.address})`);
  console.log(`   Amount: ${amount}`);
  console.log(`   From: ${ACCOUNT.address}\n`);

  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl, { timeout: 20000 }),
  });

  const walletClient = createWalletClient({
    account: ACCOUNT,
    chain: config.chain,
    transport: http(config.rpcUrl, { timeout: 20000 }),
  });

  try {
    // Check sender balance
    const senderBalance = await publicClient.readContract({
      address: token.address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [ACCOUNT.address],
    });

    const amountWei = parseUnits(amount, token.decimals);

    if (senderBalance < amountWei) {
      console.error(`❌ Insufficient balance!`);
      console.error(`   Your balance: ${senderBalance} (need ${amountWei})`);
      return;
    }

    console.log(`✅ Sufficient balance: ${senderBalance}`);
    console.log(`\n📤 Sending ${amount} ${token.symbol} to bridge...`);

    // Transfer tokens to bridge
    const txHash = await walletClient.writeContract({
      address: token.address,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [bridgeAddress, amountWei],
    });

    console.log(`   ✅ Transaction sent: ${txHash}`);
    console.log(`   Waiting for confirmation...`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status === 'success') {
      console.log(`   ✅ Bridge funded successfully!`);
      
      // Check new balance
      const newBalance = await publicClient.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [bridgeAddress],
      });

      console.log(`   💰 Bridge now has: ${newBalance} ${token.symbol}`);
    } else {
      console.error(`   ❌ Transaction failed`);
    }
  } catch (error) {
    console.error(`❌ Error:`, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log('💰 SimpleBridge Funding Tool\n');
    console.log('Usage: bun run fund-bridge.ts <chainId> <token> <amount>\n');
    console.log('Examples:');
    console.log('  bun run fund-bridge.ts 421614 USDC 10    # Fund Arbitrum Sepolia with 10 USDC');
    console.log('  bun run fund-bridge.ts 84532 DAI 100     # Fund Base Sepolia with 100 DAI\n');
    console.log('Available chains:');
    for (const [id, cfg] of Object.entries(CHAIN_CONFIGS)) {
      console.log(`  ${id} - ${cfg.name} (tokens: ${cfg.tokens.map(t => t.symbol).join(', ')})`);
    }
    return;
  }

  const [chainIdStr, tokenSymbol, amount] = args;
  const chainId = Number(chainIdStr);

  await fundBridge(chainId, tokenSymbol, amount);
}

main().catch(console.error);
