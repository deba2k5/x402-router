/* eslint-env node */
/**
 * Mint a specific test token (USDC or DAI) to an account on a configured testnet
 * Usage: bun run Facilitator/mintToken.ts <chainName> <tokenSymbol> <recipientAddress> <amount>
 * Example: bun run Facilitator/mintToken.ts base-sepolia USDC 0xYourAddress 1000
 */

import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia } from 'viem/chains';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config();

const [,, chainName, tokenSymbolRaw, recipientAddress, amountStr] = process.argv;

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

if (!chainName || !tokenSymbolRaw || !recipientAddress || !amountStr) {
  die('Usage: bun run Facilitator/mintToken.ts <chainName> <tokenSymbol: USDC|DAI> <recipientAddress> <amount>');
}

const tokenSymbol = tokenSymbolRaw.toUpperCase();
if (tokenSymbol !== 'USDC' && tokenSymbol !== 'DAI') {
  die('tokenSymbol must be USDC or DAI');
}

const chainMap: Record<string, any> = {
  'base-sepolia': baseSepolia,
  'sepolia': sepolia,
  'arbitrum-sepolia': arbitrumSepolia,
  'optimism-sepolia': optimismSepolia,
};

const deploymentFileMap: Record<string, string> = {
  'base-sepolia': 'baseSepolia',
  'sepolia': 'sepolia',
  'arbitrum-sepolia': 'arbitrumSepolia',
  'optimism-sepolia': 'optimismSepolia',
};

function getTokenConfig(chain: string) {
  const deploymentName = deploymentFileMap[chain];
  if (!deploymentName) die(`Unknown chain: ${chain}`);
  const deploymentFile = path.join(import.meta.dir, `../contracts/deployments/${deploymentName}-tokens.json`);
  try {
    const data = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
    return {
      usdc: data.tokens.MockUSDC.address as `0x${string}`,
      dai: data.tokens.MockDAI?.address as `0x${string}` | undefined,
      usdcDecimals: data.tokens.MockUSDC.decimals as number,
      daiDecimals: (data.tokens.MockDAI?.decimals ?? 18) as number,
    };
  } catch (e: any) {
    die(`Failed to load token config: ${e?.message}\nTried: ${deploymentFile}`);
  }
}

const ERC20_MINT_ABI = [
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

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

async function main() {
  const chain = chainMap[chainName as string];
  if (!chain) die(`Unsupported chain: ${chainName}`);

  const { usdc, dai, usdcDecimals, daiDecimals } = getTokenConfig(chainName as string);
  const tokenAddress = tokenSymbol === 'USDC' ? usdc : dai;
  const decimals = tokenSymbol === 'USDC' ? usdcDecimals : daiDecimals;
  if (!tokenAddress) die(`Token ${tokenSymbol} address not found in deployments for ${chainName}`);
  const tokenAddr = tokenAddress as `0x${string}`;

  const rpcUrlMap: Record<string, string> = {
    'base-sepolia': process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    'sepolia': process.env.SEPOLIA_RPC || 'https://rpc.sepolia.org',
    'arbitrum-sepolia': process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
    'optimism-sepolia': process.env.OPTIMISM_SEPOLIA_RPC || 'https://sepolia.optimism.io',
  };

  const rpcUrl = rpcUrlMap[chainName as string];
  if (!rpcUrl) die(`Missing RPC for ${chainName}`);

  const pk = process.env.EVM_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) die('EVM_PRIVATE_KEY not set in .env');

  const account = privateKeyToAccount(pk as `0x${string}`);

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  console.log(`🚀 Minting ${tokenSymbol} on ${chainName}`);
  console.log(`   Token: ${tokenAddress}`);
  console.log(`   Recipient: ${recipientAddress}`);
  console.log(`   Amount: ${amountStr}`);

  const before = await publicClient.readContract({
    address: tokenAddr,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [recipientAddress as `0x${string}`],
  });
  console.log(`⏳ Current balance: ${Number(before) / (10 ** decimals)} ${tokenSymbol}`);

  const amount = parseUnits(amountStr as string, decimals);
  const hash = await walletClient.writeContract({
    address: tokenAddr,
    abi: ERC20_MINT_ABI,
    functionName: 'mint',
    chain,
    args: [recipientAddress as `0x${string}`, amount],
  });
  console.log(`📤 TX sent: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✅ Confirmed in block ${receipt.blockNumber}`);

  const after = await publicClient.readContract({
    address: tokenAddr,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [recipientAddress as `0x${string}`],
  });
  console.log(`💰 New balance: ${Number(after) / (10 ** decimals)} ${tokenSymbol}`);
}

main().catch((e) => {
  console.error('❌ Error:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
