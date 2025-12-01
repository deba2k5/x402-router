#!/usr/bin/env bun

/**
 * SimpleBridge Off-Chain Relayer Service
 * 
 * This service listens for BridgeInitiated events on source chains and
 * completes bridge transfers on destination chains by calling completeBridge()
 * 
 * Usage:
 *   bun run relayer.ts
 * 
 * Environment Variables:
 *   - EVM_PRIVATE_KEY: Private key of relayer account
 *   - RELAYER_ADDRESS: (optional) Relayer address (derived from private key if not set)
 */

import { createPublicClient, createWalletClient, http, type Hex, type Address, type Chain, decodeErrorResult } from 'viem';
import { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

// ============ Configuration ============

const EVM_PRIVATE_KEY = (process.env.EVM_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001') as Hex;
const RELAYER_ACCOUNT = privateKeyToAccount(EVM_PRIVATE_KEY);

console.log('🚀 SimpleBridge Off-Chain Relayer Starting...\n');
console.log(`📍 Relayer Address: ${RELAYER_ACCOUNT.address}`);

// Rate limiting configuration
type RateLimitConfig = {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
};

const RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// Track rate limit state per chain
const chainRateLimitState: Record<number, { retries: number; nextRetryTime: number }> = {};

// Bridge contract addresses (can be overridden via env vars)
const BRIDGE_ADDRESSES: Record<number, Address> = {
  84532: (process.env.BASE_SEPOLIA_BRIDGE || '0x9777F502DdAB647A54A1552673D123bB199B4b5e') as Address,      // Base Sepolia
  11155111: (process.env.SEPOLIA_BRIDGE || '0x560f65Ca2d08bF995c57726eC83f7de29F5B2C38') as Address,       // Ethereum Sepolia
  421614: (process.env.ARBITRUM_SEPOLIA_BRIDGE || '0x9b9a721933038D4c85F3330e8B4f8CFC5a3F31CA') as Address, // Arbitrum Sepolia
  11155420: (process.env.OPTIMISM_SEPOLIA_BRIDGE || '0x404A674a52f85789a71D530af705f2f458bc5284') as Address,// Optimism Sepolia
};

// Token address mapping between chains
// Maps source token address to destination token address
const TOKEN_ADDRESS_MAPPING: Record<string, Record<number, Address>> = {
  // Base Sepolia USDC -> other chains
  '0x2b23c6e36b46cc013158bc2869d686023fa85422': {
    421614: '0x7b926C6038a23c3E26F7f36DcBec7606BAF44434' as Address, // Arbitrum Sepolia USDC
    11155420: '0x281Ae468d00040BCbB4685972F51f87d473420F7' as Address, // Optimism Sepolia USDC
  },
  // Base Sepolia DAI -> other chains
  '0x6eb198e04d9a6844f74fc099d35b292127656a3f': {
    421614: '0xeeC4119F3B69A61744073BdaEd83421F4b29961E' as Address, // Arbitrum Sepolia DAI
    11155420: '0x7b926C6038a23c3E26F7f36DcBec7606BAF44434' as Address, // Optimism Sepolia DAI
  },
};

// Chain configurations
type ChainConfig = {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  chain: Chain;
};

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  84532: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    chain: baseSepolia,
  },
  11155111: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC || 'https://rpc.sepolia.org',
    explorerUrl: 'https://sepolia.etherscan.io',
    chain: sepolia,
  },
  421614: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    chain: arbitrumSepolia,
  },
  11155420: {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC || 'https://sepolia.optimism.io',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    chain: optimismSepolia,
  },
};

// SimpleBridge ABI
const SIMPLE_BRIDGE_ABI = [
  {
    name: 'BridgeInitiated',
    type: 'event',
    inputs: [
      { name: 'bridgeId', type: 'bytes32', indexed: true },
      { name: 'sourceChainId', type: 'uint256', indexed: true },
      { name: 'destChainId', type: 'uint256', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'from', type: 'address', indexed: false },
      { name: 'to', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'completeBridge',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'bridgeId', type: 'bytes32' },
      { name: 'token', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'processedBridges',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'bridgeId', type: 'bytes32' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'relayer',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  // Custom errors from SimpleBridge
  { name: 'UnauthorizedRelayer', type: 'error', inputs: [] },
  { name: 'InvalidAmount', type: 'error', inputs: [] },
  { name: 'TransferFailed', type: 'error', inputs: [] },
  { name: 'BridgeAlreadyProcessed', type: 'error', inputs: [] },
  { name: 'InvalidChainIds', type: 'error', inputs: [] },
] as const;

// Minimal ERC20 ABI for balance checks
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// ============ Tracking ============

interface PendingBridge {
  bridgeId: Hex;
  sourceChainId: number;
  destChainId: number;
  token: Address;
  recipient: Address;
  amount: bigint;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completionTxHash?: string;
  error?: string;
}

// In-memory bridge tracking (for demo - use database in production)
const pendingBridges = new Map<string, PendingBridge>();
const completedBridges = new Set<string>();

// ============ Core Functions ============

/**
 * Listen for BridgeInitiated events on a source chain using polling with rate limit handling
 */
async function listenForBridgeInitiated(sourceChainId: number) {
  const sourceConfig = CHAIN_CONFIGS[sourceChainId];
  if (!sourceConfig) {
    console.error(`❌ Unknown chain: ${sourceChainId}`);
    return;
  }

  const bridgeAddress = BRIDGE_ADDRESSES[sourceChainId];
  if (!bridgeAddress) {
    console.error(`❌ No SimpleBridge deployed on ${sourceConfig.name}`);
    return;
  }

  console.log(`\n👂 Listening for BridgeInitiated on ${sourceConfig.name}...`);
  console.log(`   Bridge: ${bridgeAddress}`);

  const publicClient = createPublicClient({
    transport: http(sourceConfig.rpcUrl, { timeout: 20000, retryCount: 5, retryDelay: 2000 }),
    chain: sourceConfig.chain,
  });

  // Load or initialize last block checked from file
  const stateFile = path.join(import.meta.dir, `.relayer-state-${sourceChainId}.json`);
  let lastBlockChecked = 0n;

  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      lastBlockChecked = BigInt(state.lastBlockChecked || 0);
    } catch (e) {
      // File corrupted or doesn't exist, start from recent blocks
    }
  }

  // If starting fresh, scan last 1000 blocks instead of starting from current
  if (lastBlockChecked === 0n) {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const lookbackBlocks = BigInt(process.env.RELAYER_LOOKBACK_BLOCKS || '1000');
      lastBlockChecked = currentBlock > lookbackBlocks ? currentBlock - lookbackBlocks : 0n;
      console.log(`   Starting from block ${lastBlockChecked} (${lookbackBlocks} blocks ago)`);
    } catch (e) {
      console.warn(`   Could not get current block, starting from 0`);
    }
  }

  // Initialize rate limit state
  if (!chainRateLimitState[sourceChainId]) {
    chainRateLimitState[sourceChainId] = { retries: 0, nextRetryTime: 0 };
  }

  // Preflight: skip if bridge not deployed on this chain
  try {
    const bytecode = await publicClient.getBytecode({ address: bridgeAddress });
    if (!bytecode || bytecode === '0x') {
      console.warn(`⚠️  No bytecode at bridge ${bridgeAddress} on ${sourceConfig.name}. Skipping listener for this chain.`);
      return;
    }
  } catch (e) {
    console.warn(`⚠️  Failed to fetch bytecode for ${sourceConfig.name} (${bridgeAddress}). Continuing but listener may fail: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Poll for events
  const pollInterval = setInterval(async () => {
    try {
      // Check if we should wait due to rate limiting
      const state = chainRateLimitState[sourceChainId];
      if (state.nextRetryTime > Date.now()) {
        const waitMs = state.nextRetryTime - Date.now();
        console.log(`⏳ Rate limited on ${sourceConfig.name}, waiting ${Math.ceil(waitMs / 1000)}s...`);
        return;
      }

      const currentBlock = await publicClient.getBlockNumber();

      // Only check new blocks
      if (currentBlock > lastBlockChecked) {
        // RPC providers have block range limits
        // Alchemy free tier: 10 blocks for eth_getLogs
        // Use env var to configure, default to 10 for Alchemy free tier
        const BLOCK_CHUNK_SIZE = BigInt(process.env.RELAYER_BLOCK_CHUNK_SIZE || '10');
        let fromBlock = lastBlockChecked + 1n;

        while (fromBlock <= currentBlock) {
          // inclusive range [fromBlock, toBlock]
          const proposedTo = fromBlock + (BLOCK_CHUNK_SIZE - 1n);
          const toBlock = proposedTo > currentBlock ? currentBlock : proposedTo;

          try {
            const logs = await publicClient.getLogs({
              address: bridgeAddress,
              event: {
                name: 'BridgeInitiated',
                type: 'event',
                inputs: [
                  { name: 'bridgeId', type: 'bytes32', indexed: true },
                  { name: 'sourceChainId', type: 'uint256', indexed: true },
                  { name: 'destChainId', type: 'uint256', indexed: true },
                  { name: 'token', type: 'address', indexed: false },
                  { name: 'from', type: 'address', indexed: false },
                  { name: 'to', type: 'address', indexed: false },
                  { name: 'amount', type: 'uint256', indexed: false },
                ],
              },
              fromBlock,
              toBlock,
            });

            for (const log of logs) {
              const args = log.args as any;
              const { bridgeId, sourceChainId, destChainId, token, from, to, amount } = args;

              // Track this bridge
              const key = String(bridgeId);

              // Skip if already completed or being processed
              if (completedBridges.has(key)) {
                continue;
              }

              const existing = pendingBridges.get(key);
              if (existing && (existing.status === 'processing' || existing.status === 'completed')) {
                continue;
              }

              console.log(`\n📍 BridgeInitiated detected!`);
              console.log(`   Bridge ID: ${String(bridgeId).slice(0, 18)}...`);
              console.log(`   From: ${sourceConfig.name} → ${CHAIN_CONFIGS[Number(destChainId)]?.name || `Chain ${destChainId}`}`);
              console.log(`   Token: ${token}`);
              console.log(`   Amount: ${amount?.toString()}`);
              console.log(`   From: ${from} → To: ${to}`);

              pendingBridges.set(key, {
                bridgeId: bridgeId as Hex,
                sourceChainId: Number(sourceChainId),
                destChainId: Number(destChainId),
                token: token as Address,
                recipient: to as Address,
                amount: amount as bigint,
                timestamp: Date.now(),
                status: 'pending',
              });

              // Process the bridge (don't await to avoid blocking event loop)
              processBridge(key).catch(err => {
                console.error(`   ❌ Failed to process bridge ${key}:`, err);
              });
            }

            // Reset rate limit state on success
            state.retries = 0;
            state.nextRetryTime = 0;

          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);

            // Check if it's a rate limit or block range error
            if (errorMsg.includes('429') || errorMsg.includes('rate') || errorMsg.includes('exceeded')) {
              console.warn(`⚠️  Rate limited on ${sourceConfig.name}: ${errorMsg}`);

              // Exponential backoff
              state.retries = Math.min(state.retries + 1, RATE_LIMIT_CONFIG.maxRetries);
              const delayMs = Math.min(
                RATE_LIMIT_CONFIG.initialDelayMs * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, state.retries - 1),
                RATE_LIMIT_CONFIG.maxDelayMs
              );
              state.nextRetryTime = Date.now() + delayMs;
              console.warn(`📊 Exponential backoff: ${delayMs}ms (retry ${state.retries}/${RATE_LIMIT_CONFIG.maxRetries})`);
              break; // Stop processing chunks and wait before retrying
            } else if (errorMsg.includes('block range') || errorMsg.includes('BLOCK_RANGE')) {
              console.warn(`⚠️  Block range too large on ${sourceConfig.name}. Set RELAYER_BLOCK_CHUNK_SIZE=10 in .env for Alchemy free tier.`);
              // Continue to next chunk
            } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
              console.warn(`⏱️  Timeout on ${sourceConfig.name}: ${errorMsg}`);
              // Increase polling interval slightly for timeouts
              state.nextRetryTime = Date.now() + 5000;
            } else {
              console.error(`❌ Error querying blocks ${fromBlock}-${toBlock} on ${sourceConfig.name}:`, errorMsg);
              // Continue to next chunk on other errors
            }
          }

          // advance to next range after inclusive end
          fromBlock = toBlock + 1n;
        }

        lastBlockChecked = currentBlock;

        // Save state to file
        try {
          fs.writeFileSync(stateFile, JSON.stringify({ lastBlockChecked: lastBlockChecked.toString() }));
        } catch (e) {
          // Ignore file write errors
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg.includes('429') || errorMsg.includes('rate')) {
        console.warn(`⚠️  Rate limited on ${sourceConfig.name}`);
        const state = chainRateLimitState[sourceChainId];
        state.retries = Math.min(state.retries + 1, RATE_LIMIT_CONFIG.maxRetries);
        const delayMs = Math.min(
          RATE_LIMIT_CONFIG.initialDelayMs * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, state.retries - 1),
          RATE_LIMIT_CONFIG.maxDelayMs
        );
        state.nextRetryTime = Date.now() + delayMs;
        console.warn(`📊 Exponential backoff: ${delayMs}ms (retry ${state.retries}/${RATE_LIMIT_CONFIG.maxRetries})`);
      } else {
        console.error(`❌ Polling error on ${sourceConfig.name}:`, errorMsg);
      }
    }
  }, 5000); // Poll every 5 seconds
}

/**
 * Process a pending bridge by calling completeBridge on destination chain
 */
async function processBridge(bridgeKey: string) {
  const bridge = pendingBridges.get(bridgeKey);
  if (!bridge) {
    console.error(`❌ Bridge not found: ${bridgeKey}`);
    return;
  }

  const destConfig = CHAIN_CONFIGS[bridge.destChainId];
  if (!destConfig) {
    console.error(`❌ Unknown destination chain: ${bridge.destChainId}`);
    bridge.status = 'failed';
    bridge.error = `Unknown destination chain: ${bridge.destChainId}`;
    return;
  }

  const bridgeAddress = BRIDGE_ADDRESSES[bridge.destChainId];
  if (!bridgeAddress) {
    console.error(`❌ No SimpleBridge on destination chain ${destConfig.name}`);
    bridge.status = 'failed';
    bridge.error = `SimpleBridge not deployed on ${destConfig.name}`;
    return;
  }

  console.log(`\n⚙️  Processing bridge on ${destConfig.name}...`);

  try {
    bridge.status = 'processing';

    // Map source token address to destination token address
    const sourceTokenLower = bridge.token.toLowerCase();
    const destTokenMapping = TOKEN_ADDRESS_MAPPING[sourceTokenLower];
    const destToken = destTokenMapping?.[bridge.destChainId] || bridge.token;

    if (destToken.toLowerCase() !== bridge.token.toLowerCase()) {
      console.log(`   🔄 Token mapping: ${bridge.token} -> ${destToken}`);
    }

    // Create clients for destination chain
    const publicClient = createPublicClient({
      chain: destConfig.chain,
      transport: http(destConfig.rpcUrl, { timeout: 20000, retryCount: 5, retryDelay: 2000 }),
    });
    const walletClient = createWalletClient({
      account: RELAYER_ACCOUNT,
      chain: destConfig.chain,
      transport: http(destConfig.rpcUrl, { timeout: 20000, retryCount: 5, retryDelay: 2000 }),
    });

    // Preflight checks
    try {
      // 1) Already processed?
      const alreadyProcessed = await publicClient.readContract({
        address: bridgeAddress,
        abi: SIMPLE_BRIDGE_ABI as any,
        functionName: 'processedBridges',
        args: [bridge.bridgeId],
      });
      if (alreadyProcessed) {
        console.log(`   ℹ️  Bridge already processed on-chain (preflight)`);
        bridge.status = 'completed';
        completedBridges.add(bridgeKey);
        return;
      }

      // 2) Relayer matches?
      const currentRelayer = await publicClient.readContract({
        address: bridgeAddress,
        abi: SIMPLE_BRIDGE_ABI as any,
        functionName: 'relayer',
        args: [],
      });
      if (String(currentRelayer).toLowerCase() !== RELAYER_ACCOUNT.address.toLowerCase()) {
        console.warn(`   ⚠️  Relayer mismatch: on-chain ${currentRelayer} != ${RELAYER_ACCOUNT.address}`);
      }

      // 3) Bridge token balance sufficient?
      try {
        const balance = (await publicClient.readContract({
          address: destToken as Address,
          abi: ERC20_ABI as any,
          functionName: 'balanceOf',
          args: [bridgeAddress],
        })) as bigint;
        if (balance < bridge.amount) {
          console.warn(`   ⚠️  Insufficient bridge balance: have ${balance}, need ${bridge.amount}`);
        }
      } catch (balErr) {
        console.warn(`   ⚠️  Could not read token balance: ${balErr instanceof Error ? balErr.message : String(balErr)}`);
      }
    } catch (preErr) {
      console.warn(`   ⚠️  Preflight checks encountered an issue: ${preErr instanceof Error ? preErr.message : String(preErr)}`);
    }

    // Call completeBridge with destination chain token address
    console.log(`   Calling completeBridge()...`);
    console.log(`   Token: ${destToken}`);
    console.log(`   Recipient: ${bridge.recipient}`);
    console.log(`   Amount: ${bridge.amount}`);
    const txHash = await walletClient.writeContract({
      address: bridgeAddress,
      abi: SIMPLE_BRIDGE_ABI as any,
      functionName: 'completeBridge',
      args: [bridge.bridgeId, destToken, bridge.recipient, bridge.amount],
    });

    console.log(`   ✅ Transaction sent: ${txHash}`);
    console.log(`   🔗 Explorer: ${destConfig.explorerUrl}/tx/${txHash}`);

    bridge.status = 'completed';
    bridge.completionTxHash = txHash;
    completedBridges.add(bridgeKey);
  } catch (error: any) {
    const errMsg = error?.shortMessage || (error instanceof Error ? error.message : String(error));
    let decoded = '';
    try {
      if (error?.data) {
        const decodedErr = decodeErrorResult({ abi: SIMPLE_BRIDGE_ABI as any, data: error.data });
        decoded = ` | decoded: ${decodedErr?.errorName || ''}`;
      }
    } catch { }
    const errData = error?.data ? ` | data: ${error.data}` : '';

    // Check for BridgeAlreadyProcessed error (0xf6bc998c)
    if (errMsg.includes('0xf6bc998c') || errMsg.includes('BridgeAlreadyProcessed') || decoded.includes('BridgeAlreadyProcessed')) {
      console.log(`   ℹ️  Bridge already processed on-chain`);
      bridge.status = 'completed';
      completedBridges.add(bridgeKey);
      return;
    }

    console.error(`   ❌ Error completing bridge: ${errMsg}${errData}${decoded}`);

    // Check for common issues
    if (errMsg.includes('insufficient funds') || errMsg.includes('balance') || errMsg.includes('TransferFailed')) {
      console.error(`   💡 Bridge contract may not have enough tokens on ${destConfig.name}`);
      console.error(`   💡 Run: bun run check-bridge-balance.ts`);
    } else if (errMsg.includes('role') || errMsg.includes('unauthorized') || errMsg.includes('UnauthorizedRelayer')) {
      console.error(`   💡 Relayer address may not be authorized on bridge contract`);
      console.error(`   💡 Run: bun run check-relayer.ts`);
    } else if (errMsg.includes('InvalidAmount')) {
      console.error(`   💡 Invalid amount or recipient address`);
    }

    bridge.status = 'failed';
    bridge.error = errMsg;

    // Retry logic for transient errors only
    if (!errMsg.includes('0xf6bc998c') && !errMsg.includes('Unauthorized') && !errMsg.includes('Invalid')) {
      console.log(`   💡 Tip: Retrying in 30 seconds...`);
      setTimeout(() => {
        processBridge(bridgeKey);
      }, 30000);
    }
  }
}

/**
 * Get status of all bridges
 */
function getStatus() {
  console.log('\n\n📊 Bridge Status Report');
  console.log('═'.repeat(60));

  if (pendingBridges.size === 0) {
    console.log('No pending bridges');
    return;
  }

  let pending = 0;
  let processing = 0;
  let completed = 0;
  let failed = 0;

  for (const [key, bridge] of pendingBridges) {
    const sourceChain = CHAIN_CONFIGS[bridge.sourceChainId]?.name || `Chain ${bridge.sourceChainId}`;
    const destChain = CHAIN_CONFIGS[bridge.destChainId]?.name || `Chain ${bridge.destChainId}`;
    const id = String(bridge.bridgeId).slice(0, 18);

    switch (bridge.status) {
      case 'pending':
        pending++;
        console.log(`⏳ ${id}... | ${sourceChain} → ${destChain} | Amount: ${bridge.amount}`);
        break;
      case 'processing':
        processing++;
        console.log(`⚙️  ${id}... | ${sourceChain} → ${destChain} | Processing...`);
        break;
      case 'completed':
        completed++;
        console.log(`✅ ${id}... | ${sourceChain} → ${destChain} | TX: ${bridge.completionTxHash?.slice(0, 18)}...`);
        break;
      case 'failed':
        failed++;
        console.log(`❌ ${id}... | ${sourceChain} → ${destChain} | Error: ${bridge.error}`);
        break;
    }
  }

  console.log('═'.repeat(60));
  console.log(`Summary: ${pending} pending | ${processing} processing | ${completed} completed | ${failed} failed`);
}

// ============ Main ============

async function main() {
  console.log('\n🌉 SimpleBridge Relayer Service\n');

  // Show configuration
  const blockChunkSize = process.env.RELAYER_BLOCK_CHUNK_SIZE || '10';
  console.log('⚙️  Configuration:');
  console.log(`   Block chunk size: ${blockChunkSize} blocks`);
  console.log(`   Relayer address: ${RELAYER_ACCOUNT.address}\n`);

  console.log('Listening for BridgeInitiated events on all chains...\n');

  // Start listening on all source chains
  const allChainIds = Object.keys(CHAIN_CONFIGS).map(Number);
  const allowlistEnv = (process.env.RELAYER_CHAINS || '').trim();
  const chainIds = allowlistEnv
    ? allowlistEnv.split(',').map((s) => Number(s.trim())).filter((n) => allChainIds.includes(n))
    : allChainIds;

  if (allowlistEnv && chainIds.length === 0) {
    console.warn('⚠️  RELAYER_CHAINS is set but no valid chain IDs were parsed. Falling back to all chains.');
  }

  for (const chainId of chainIds) {
    listenForBridgeInitiated(chainId);
  }

  // Periodic status report
  setInterval(getStatus, 60000); // Every 60 seconds

  // Keep service running
  console.log('\n✅ Relayer service running');
  console.log('Press Ctrl+C to stop\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down relayer...');
  getStatus();
  process.exit(0);
});

main().catch(console.error);
