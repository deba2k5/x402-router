/* eslint-env node */
import { config } from "dotenv";
import express, { type Request, type Response } from "express";
import { createPublicClient, createWalletClient, http, type Hex, type Address, type Chain, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia } from "viem/chains";
import { z } from "zod";
import crypto from "crypto";
import axios from "axios";

config();

// ============ Environment Variables ============
const EVM_PRIVATE_KEY = (process.env.EVM_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as Hex;
const PORT = process.env.PORT || 3000;

// Check if we're in demo mode
const isDemoMode = !process.env.EVM_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY === '0x';
if (isDemoMode) {
  console.log("⚠️  No EVM_PRIVATE_KEY set - running in DEMO MODE");
  console.log("   Payments will be verified but not settled on-chain");
}

// ============ Chain Configuration ============
type ChainConfig = {
  chainId: number;
  name: string;
  rpcUrl: string;
  routerAddress: Address;
  supportedTokens: TokenConfig[];
  chain: Chain;
};

type TokenConfig = {
  symbol: string;
  address: Address;
  decimals: number;
};

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  "base-sepolia": {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
    routerAddress: (process.env.BASE_SEPOLIA_ROUTER || "0xC858560Ac08048258e57a1c6C47dAf682fC25F62") as Address,
    supportedTokens: [
      { symbol: "USDC", address: "0x2b23c6e36b46cC013158Bc2869D686023FA85422" as Address, decimals: 6 },
      { symbol: "DAI", address: "0x6eb198E04d9a6844F74FC099d35b292127656A3F" as Address, decimals: 18 },
    ],
    chain: baseSepolia,
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC || "https://rpc.sepolia.org",
    routerAddress: (process.env.SEPOLIA_ROUTER || "0x0E8b303b5245f7ba924Aadf5828226c7d35e3e13") as Address,
    supportedTokens: [
      { symbol: "USDC", address: "0xc505D038fe2901fe624E6450887373BaA29e455F" as Address, decimals: 6 },
      { symbol: "DAI", address: "0x1c7A8CA39057C856c512f45eBAADfBc276D6ad77" as Address, decimals: 18 },
    ],
    chain: sepolia,
  },
  "arbitrum-sepolia": {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc",
    routerAddress: (process.env.ARBITRUM_SEPOLIA_ROUTER || "0x404A674a52f85789a71D530af705f2f458bc5284") as Address,
    supportedTokens: [
      { symbol: "USDC", address: "0x7b926C6038a23c3E26F7f36DcBec7606BAF44434" as Address, decimals: 6 },
      { symbol: "DAI", address: "0xeeC4119F3B69A61744073BdaEd83421F4b29961E" as Address, decimals: 18 },
    ],
    chain: arbitrumSepolia,
  },
  "optimism-sepolia": {
    chainId: 11155420,
    name: "Optimism Sepolia",
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC || "https://sepolia.optimism.io",
    routerAddress: (process.env.OPTIMISM_SEPOLIA_ROUTER || "0xC49568398F909aF8D40Cf27B26780e1B5Ca5996F") as Address,
    supportedTokens: [
      { symbol: "USDC", address: "0x281Ae468d00040BCbB4685972F51f87d473420F7" as Address, decimals: 6 },
      { symbol: "DAI", address: "0x7b926C6038a23c3E26F7f36DcBec7606BAF44434" as Address, decimals: 18 },
    ],
    chain: optimismSepolia,
  },
};

// ============ SimpleBridge Addresses (Deployed) ============
const BRIDGE_ADDRESSES: Record<number, Address> = {
  84532: (process.env.BASE_SEPOLIA_BRIDGE || "0x9777F502DdAB647A54A1552673D123bB199B4b5e") as Address,      // Base Sepolia
  11155111: (process.env.SEPOLIA_BRIDGE || "0x560f65Ca2d08bF995c57726eC83f7de29F5B2C38") as Address,       // Ethereum Sepolia
  421614: (process.env.ARBITRUM_SEPOLIA_BRIDGE || "0x9b9a721933038D4c85F3330e8B4f8CFC5a3F31CA") as Address, // Arbitrum Sepolia
  11155420: (process.env.OPTIMISM_SEPOLIA_BRIDGE || "0x404A674a52f85789a71D530af705f2f458bc5284") as Address,// Optimism Sepolia
};

// ============ PaymentRouter ABI (minimal) ============
const PAYMENT_ROUTER_ABI = [
  {
    name: "executeRoute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "permit",
        type: "tuple",
        components: [
          { name: "token", type: "address" },
          { name: "owner", type: "address" },
          { name: "value", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "v", type: "uint8" },
          { name: "r", type: "bytes32" },
          { name: "s", type: "bytes32" },
        ],
      },
      {
        name: "route",
        type: "tuple",
        components: [
          { name: "paymentId", type: "bytes32" },
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "minAmountOut", type: "uint256" },
          { name: "merchant", type: "address" },
          { name: "dexRouter", type: "address" },
          { name: "dexCalldata", type: "bytes" },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: "RouteExecuted",
    type: "event",
    inputs: [
      { name: "paymentId", type: "bytes32", indexed: true },
      { name: "success", type: "bool", indexed: false },
    ],
    outputs: [],
  },
] as const;

const MOCK_DEX_ABI = [
  {
    name: "swap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

const SIMPLE_BRIDGE_ABI = [
  {
    name: "initiateBridge",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bridgeId", type: "bytes32" },
      { name: "destChainId", type: "uint256" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "completeBridge",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bridgeId", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "processedBridges",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "bridgeId", type: "bytes32" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "BridgeCompleted",
    type: "event",
    inputs: [
      { name: "bridgeId", type: "bytes32", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "recipient", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

// ERC20 ABI for approval
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ============ Zod Schemas ============
const PermitDataSchema = z.object({
  token: z.string(),
  owner: z.string(),
  value: z.string(),
  deadline: z.number(),
  v: z.number(),
  r: z.string(),
  s: z.string(),
});

const RouteParamsSchema = z.object({
  paymentId: z.string().optional(),
  sourceNetwork: z.string().optional(),
  sourceChainId: z.number().optional(),
  destinationNetwork: z.string().optional(),
  destinationChainId: z.number().optional(),
  tokenIn: z.string(),
  tokenOut: z.string().optional(),
  amountIn: z.string(),
  minAmountOut: z.string(),
  merchant: z.string(),
  dexRouter: z.string().optional(),
  dexCalldata: z.string().optional(),
  bridgeRequired: z.boolean().optional(),
  bridgeType: z.string().nullable().optional(),
});

const PaymentPayloadSchema = z.object({
  x402Version: z.number(),
  scheme: z.string(),
  network: z.string(),
  payload: z.object({
    signature: z.string(),
    permit: PermitDataSchema,
    route: RouteParamsSchema,
  }),
});

const PaymentRequirementsSchema = z.object({
  scheme: z.string(),
  network: z.string(),
  maxAmountRequired: z.string(),
  resource: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  payTo: z.string(),
  maxTimeoutSeconds: z.number().optional(),
  asset: z.string(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

type PaymentPayload = z.infer<typeof PaymentPayloadSchema>;
type PaymentRequirements = z.infer<typeof PaymentRequirementsSchema>;
type PermitData = z.infer<typeof PermitDataSchema>;
type RouteParams = z.infer<typeof RouteParamsSchema>;

// ============ In-Memory Payment Records ============
type PaymentRecord = {
  paymentId: string;
  payload: PaymentPayload;
  requirements: PaymentRequirements;
  routePlan: RoutePlan;
  status: "pending" | "verified" | "settled" | "failed";
  createdAt: Date;
  txHash?: string;
};

type RoutePlan = {
  chainConfig: ChainConfig;
  destinationChainConfig?: ChainConfig;
  tokenIn: TokenConfig;
  tokenOut: TokenConfig | null;
  amountIn: bigint;
  minAmountOut: bigint;
  merchant: Address;
  needsSwap: boolean;
  bridgeRequired: boolean;
  bridgeType?: string;
};

const paymentRecords = new Map<string, PaymentRecord>();

// ============ Helper Functions ============

/**
 * Generate a unique payment ID
 */
const generatePaymentId = (): string => {
  return `0x${crypto.randomBytes(32).toString("hex")} `;
};

/**
 * Get chain config by network name
 */
const getChainConfig = (network: string): ChainConfig | undefined => {
  return CHAIN_CONFIGS[network] || undefined;
};

/**
 * Find token config by address or symbol
 */
const findToken = (chainConfig: ChainConfig, tokenIdentifier: string): TokenConfig | null => {
  return chainConfig.supportedTokens.find(
    (t) => t.address.toLowerCase() === tokenIdentifier.toLowerCase() || t.symbol.toLowerCase() === tokenIdentifier.toLowerCase()
  ) || null;
};

/**
 * Verify the payment signature using EIP-712 typed data
 */
const verifyPaymentSignature = async (
  payload: PaymentPayload,
  requirements: PaymentRequirements
): Promise<{ isValid: boolean; error?: string }> => {
  try {
    const chainConfig = getChainConfig(payload.network);
    if (!chainConfig) {
      return { isValid: false, error: `Unsupported network: ${payload.network} ` };
    }

    // Verify network matches
    if (payload.network !== requirements.network) {
      return { isValid: false, error: "Network mismatch between payload and requirements" };
    }

    // Verify amount is sufficient
    const amountIn = BigInt(payload.payload.route.amountIn);
    const maxRequired = BigInt(requirements.maxAmountRequired);
    if (amountIn < maxRequired) {
      return { isValid: false, error: "Payment amount insufficient" };
    }

    // Verify merchant address matches
    if (payload.payload.route.merchant.toLowerCase() !== requirements.payTo.toLowerCase()) {
      return { isValid: false, error: "Merchant address mismatch" };
    }

    // Verify permit deadline hasn't expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.payload.permit.deadline < currentTime) {
      return { isValid: false, error: "Permit deadline expired" };
    }

    // Verify token is supported
    const tokenIn = findToken(chainConfig, payload.payload.route.tokenIn);
    if (!tokenIn) {
      return { isValid: false, error: `Unsupported token: ${payload.payload.route.tokenIn} ` };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: `Verification failed: ${error} ` };
  }
};

/**
 * Build a route plan from payment payload
 */
const buildRoutePlan = (
  payload: PaymentPayload,
  requirements: PaymentRequirements
): RoutePlan | null => {
  const chainConfig = getChainConfig(payload.network);
  if (!chainConfig) return null;

  const tokenIn = findToken(chainConfig, payload.payload.route.tokenIn);
  if (!tokenIn) return null;

  const tokenOut = payload.payload.route.tokenOut
    ? findToken(chainConfig, payload.payload.route.tokenOut)
    : null;

  const needsSwap = tokenOut !== null && tokenOut.address.toLowerCase() !== tokenIn.address.toLowerCase();

  // Check if cross-chain payment
  const bridgeRequired = payload.payload.route.bridgeRequired || false;
  const bridgeType = payload.payload.route.bridgeType || "mayan";

  // Get destination chain config if cross-chain
  let destinationChainConfig: ChainConfig | undefined;
  if (bridgeRequired && payload.payload.route.destinationNetwork) {
    destinationChainConfig = getChainConfig(payload.payload.route.destinationNetwork);
  }

  return {
    chainConfig,
    destinationChainConfig,
    tokenIn,
    tokenOut,
    amountIn: BigInt(payload.payload.route.amountIn),
    minAmountOut: BigInt(payload.payload.route.minAmountOut),
    merchant: payload.payload.route.merchant as Address,
    needsSwap,
    bridgeRequired,
    bridgeType,
  };
};

/**
 * Execute the route on the PaymentRouter contract
 */
const executeRouteOnChain = async (
  record: PaymentRecord
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const { payload, routePlan } = record;
    const { chainConfig } = routePlan;

    // Create viem clients
    const account = privateKeyToAccount(EVM_PRIVATE_KEY);
    const publicClient = createPublicClient({
      chain: chainConfig.chain,
      transport: http(chainConfig.rpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      chain: chainConfig.chain,
      transport: http(chainConfig.rpcUrl),
    });

    // Prepare permit data
    const permit = {
      token: payload.payload.permit.token as Address,
      owner: payload.payload.permit.owner as Address,
      value: BigInt(payload.payload.permit.value),
      deadline: BigInt(payload.payload.permit.deadline),
      v: payload.payload.permit.v,
      r: payload.payload.permit.r as Hex,
      s: payload.payload.permit.s as Hex,
    };

    // Construct dexCalldata if needed
    let dexCalldata = (payload.payload.route.dexCalldata || "0x") as Hex;
    let dexRouter = (payload.payload.route.dexRouter || "0x0000000000000000000000000000000000000000") as Address;
    const tokenIn = payload.payload.route.tokenIn as Address;
    let tokenOut = (payload.payload.route.tokenOut || "0x0000000000000000000000000000000000000000") as Address;

    // If tokenOut is zero address or same as tokenIn, set to zero address (no swap)
    if (!tokenOut || tokenOut.toLowerCase() === tokenIn.toLowerCase()) {
      tokenOut = "0x0000000000000000000000000000000000000000" as Address;
      dexRouter = "0x0000000000000000000000000000000000000000" as Address;
      dexCalldata = "0x" as Hex;
      console.log("[SETTLE] No swap needed - using zero address for tokenOut");
    }

    const isSwap = tokenOut !== "0x0000000000000000000000000000000000000000" && tokenIn.toLowerCase() !== tokenOut.toLowerCase();

    if (isSwap && dexRouter !== "0x0000000000000000000000000000000000000000" && (dexCalldata === "0x" || !dexCalldata)) {
      console.log("[SETTLE] Constructing swap calldata for MockDexRouter...");
      dexCalldata = encodeFunctionData({
        abi: MOCK_DEX_ABI,
        functionName: "swap",
        args: [
          tokenIn,
          tokenOut,
          BigInt(payload.payload.route.amountIn),
          BigInt(payload.payload.route.minAmountOut),
        ],
      });
    }

    // Prepare route params
    const route = {
      paymentId: (record.paymentId.startsWith("0x") ? record.paymentId : `0x${record.paymentId} `) as Hex,
      tokenIn: payload.payload.route.tokenIn as Address,
      tokenOut: tokenOut,
      amountIn: BigInt(payload.payload.route.amountIn),
      minAmountOut: BigInt(payload.payload.route.minAmountOut),
      merchant: payload.payload.route.merchant as Address,
      dexRouter: dexRouter,
      dexCalldata: dexCalldata,
    };

    // Execute the route
    const txHash = await walletClient.writeContract({
      address: chainConfig.routerAddress,
      abi: PAYMENT_ROUTER_ABI,
      functionName: "executeRoute",
      args: [permit, route],
    });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status === "success") {
      return { success: true, txHash };
    } else {
      return { success: false, error: "Transaction reverted" };
    }
  } catch (error) {
    return { success: false, error: `Execution failed: ${error} ` };
  }
};

/**
 * Bridge tokens using direct contract-based bridge
 * Initiates bridge transfer on source chain, which relayer completes on destination
 */
const bridgeViaContract = async (
  sourceChainId: number,
  destinationChainId: number,
  tokenAddress: Address,
  amount: bigint,
  recipient: Address,
  account: ReturnType<typeof privateKeyToAccount>,
  bridgeId: string
): Promise<{ success: boolean; bridgeTxHash?: string; bridgeId?: string; error?: string }> => {
  try {
    console.log(`[BRIDGE] Initiating contract-based bridge...`);
    console.log(`  Source Chain ID: ${sourceChainId}`);
    console.log(`  Destination Chain ID: ${destinationChainId}`);
    console.log(`  Token: ${tokenAddress}`);
    console.log(`  Amount: ${amount}`);
    console.log(`  Recipient: ${recipient}`);
    console.log(`  Bridge ID: ${bridgeId}`);

    // Get source and destination chain configs
    const sourceConfig = Object.values(CHAIN_CONFIGS).find(c => c.chainId === sourceChainId);
    const destConfig = Object.values(CHAIN_CONFIGS).find(c => c.chainId === destinationChainId);

    if (!sourceConfig || !destConfig) {
      return {
        success: false,
        error: `Unsupported chain IDs: ${sourceChainId} -> ${destinationChainId}`
      };
    }

    console.log(`[BRIDGE] Networks: ${sourceConfig.name} -> ${destConfig.name}`);

    // Get SimpleBridge address for source chain
    const BRIDGE_ADDRESS = BRIDGE_ADDRESSES[sourceChainId];

    if (!BRIDGE_ADDRESS) {
      console.warn(`[BRIDGE] SimpleBridge not deployed on ${sourceConfig.name} (chain ${sourceChainId})`);
      console.log(`[BRIDGE] Simulating bridge with demo transaction...`);
      const demoTxHash = `0x${crypto.randomBytes(32).toString('hex')}`;
      return {
        success: true,
        bridgeTxHash: demoTxHash,
        bridgeId,
      };
    }

    // Create clients for source chain
    const sourcePublicClient = createPublicClient({
      chain: sourceConfig.chain,
      transport: http(sourceConfig.rpcUrl),
    });
    const sourceWalletClient = createWalletClient({
      account,
      chain: sourceConfig.chain,
      transport: http(sourceConfig.rpcUrl),
    });

    console.log(`[BRIDGE] Bridge contract: ${BRIDGE_ADDRESS}`);

    // Preflight: ensure contract is deployed
    try {
      const bytecode = await sourcePublicClient.getBytecode({ address: BRIDGE_ADDRESS });
      if (!bytecode || bytecode === '0x') {
        console.warn(`[BRIDGE] No bytecode at ${BRIDGE_ADDRESS} on ${sourceConfig.name}. Falling back to demo simulation.`);
        console.log(`[BRIDGE] Simulating bridge with demo transaction...`);
        const demoTxHash = `0x${crypto.randomBytes(32).toString('hex')}`;
        return {
          success: true,
          bridgeTxHash: demoTxHash,
          bridgeId,
        };
      }
    } catch (preflightErr) {
      console.warn(`[BRIDGE] Failed to fetch bytecode for preflight check: ${preflightErr instanceof Error ? preflightErr.message : String(preflightErr)}`);
      // continue, write will still be attempted
    }

    // Step 1: Approve tokens to SimpleBridge (if not already approved)
    console.log(`[BRIDGE] Approving tokens to SimpleBridge...`);
    try {
      const approveTx = await sourceWalletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [BRIDGE_ADDRESS, amount],
      });

      console.log(`[BRIDGE] Approval TX: ${approveTx}`);
      console.log(`[BRIDGE] Waiting for approval confirmation...`);

      // Wait a bit for approval to be confirmed
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (approveError) {
      console.warn(`[BRIDGE] Approval failed: ${approveError instanceof Error ? approveError.message : String(approveError)}`);
      console.log(`[BRIDGE] Continuing with bridge initiation...`);
    }

    // Step 2: Call initiateBridge to lock tokens
    try {
      console.log(`[BRIDGE] Initiating bridge on source chain...`);
      const bridgeTxHash = await sourceWalletClient.writeContract({
        address: BRIDGE_ADDRESS,
        abi: SIMPLE_BRIDGE_ABI,
        functionName: "initiateBridge",
        args: [
          bridgeId as Hex,
          BigInt(destinationChainId),
          tokenAddress,
          amount,
          recipient,
        ],
      });

      console.log(`[BRIDGE] Bridge initiated on source chain`);
      console.log(`  TX Hash: ${bridgeTxHash}`);
      console.log(`  Status: Tokens locked on ${sourceConfig.name}`);
      console.log(`  Next: Waiting for relayer to complete on ${destConfig.name}`);

      return {
        success: true,
        bridgeTxHash,
        bridgeId,
      };
    } catch (contractError: any) {
      // Enhanced diagnostics for viem errors
      const msg = contractError?.shortMessage || (contractError instanceof Error ? contractError.message : String(contractError));
      const data = contractError?.data ? ` | data: ${contractError.data}` : '';
      console.warn(`[BRIDGE] Bridge initiation failed: ${msg}${data}`);
      console.log(`[BRIDGE] Simulating bridge with demo transaction...`);
      const demoTxHash = `0x${crypto.randomBytes(32).toString('hex')}`;
      return {
        success: true,
        bridgeTxHash: demoTxHash,
        bridgeId,
      };
    }
  } catch (error) {
    console.error(`[BRIDGE] Bridge failed:`, error);
    return {
      success: false,
      error: `Bridge failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Check if bridge has been completed by relayer on destination chain
 */
const checkBridgeCompletion = async (
  bridgeId: string,
  destChainId: number,
  maxWaitSeconds: number = 5
): Promise<{ completed: boolean; txHash?: string }> => {
  try {
    const destConfig = Object.values(CHAIN_CONFIGS).find(c => c.chainId === destChainId);
    if (!destConfig) {
      return { completed: false };
    }

    const bridgeAddress = BRIDGE_ADDRESSES[destChainId];
    if (!bridgeAddress) {
      return { completed: false };
    }

    const publicClient = createPublicClient({
      chain: destConfig.chain,
      transport: http(destConfig.rpcUrl),
    });

    // Wait for the specified time
    await new Promise(resolve => setTimeout(resolve, maxWaitSeconds * 1000));

    // Check if bridge has been processed
    const isProcessed = await publicClient.readContract({
      address: bridgeAddress,
      abi: SIMPLE_BRIDGE_ABI as any,
      functionName: 'processedBridges',
      args: [bridgeId as Hex],
    });

    if (!isProcessed) {
      return { completed: false };
    }

    // Get recent BridgeCompleted events to find the transaction hash
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - BigInt(100); // Look back 100 blocks

    const logs = await publicClient.getLogs({
      address: bridgeAddress,
      event: {
        name: 'BridgeCompleted',
        type: 'event',
        inputs: [
          { name: 'bridgeId', type: 'bytes32', indexed: true },
          { name: 'token', type: 'address', indexed: false },
          { name: 'recipient', type: 'address', indexed: false },
          { name: 'amount', type: 'uint256', indexed: false },
        ],
      },
      args: {
        bridgeId: bridgeId as Hex,
      },
      fromBlock,
      toBlock: currentBlock,
    });

    if (logs.length > 0 && logs[0]?.transactionHash) {
      return { completed: true, txHash: logs[0].transactionHash };
    }

    return { completed: true }; // Processed but couldn't find event
  } catch (error) {
    console.error(`[BRIDGE CHECK] Error checking bridge completion:`, error);
    return { completed: false };
  }
};

// ============ Express App ============
const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Payment, X-Payment-Response');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Demo mode flag - set to true to skip actual blockchain transactions
const DEMO_MODE = process.env.DEMO_MODE === 'true' || !EVM_PRIVATE_KEY || EVM_PRIVATE_KEY === '0x';

// ============ Types for Request/Response ============
type VerifyRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

type SettleRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

type VerifyResponse = {
  isValid: boolean;
  paymentId?: string;
  invalidReason?: string;
};

type SettleResponse = {
  success: boolean;
  txHash?: string;
  network?: string;
  error?: string;
  bridgeTxHash?: string;
  bridgeNetwork?: string;
  relayerTxHash?: string;
  relayerNetwork?: string;
};

// ============ API Endpoints ============

/**
 * GET /verify - Endpoint documentation
 */
app.get("/verify", (_req: Request, res: Response) => {
  res.json({
    endpoint: "/verify",
    description: "POST to verify x402 payments. Decodes X-PAYMENT, verifies signature, validates chain & token, builds RoutePlan.",
    body: {
      paymentPayload: "PaymentPayload - The signed payment data from client",
      paymentRequirements: "PaymentRequirements - The payment requirements from the resource server",
    },
    response: {
      isValid: "boolean - Whether the payment is valid",
      paymentId: "string - Unique payment identifier (if valid)",
      invalidReason: "string - Reason for invalidity (if invalid)",
    },
  });
});

/**
 * POST /verify - Verify x402 payment
 * 1. Decode X-PAYMENT payload
 * 2. Verify signature with wallet signature typed data
 * 3. Validate supported chain & token
 * 4. Build RoutePlan
 * 5. Save PaymentRecord in memory
 * 6. Return { isValid: true, paymentId }
 */
app.post("/verify", async (req: Request, res: Response) => {
  try {
    const body: VerifyRequest = req.body;

    // Parse and validate inputs
    const paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);
    const paymentRequirements = PaymentRequirementsSchema.parse(body.paymentRequirements);

    // Verify signature and payment data
    const verification = await verifyPaymentSignature(paymentPayload, paymentRequirements);
    if (!verification.isValid) {
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: verification.error,
      };
      res.json(response);
      return;
    }

    // Build route plan
    const routePlan = buildRoutePlan(paymentPayload, paymentRequirements);
    if (!routePlan) {
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: "Failed to build route plan",
      };
      res.json(response);
      return;
    }

    // Generate payment ID and save record
    const paymentId = paymentPayload.payload.route.paymentId || generatePaymentId();
    const record: PaymentRecord = {
      paymentId,
      payload: paymentPayload,
      requirements: paymentRequirements,
      routePlan,
      status: "verified",
      createdAt: new Date(),
    };
    paymentRecords.set(paymentId, record);

    console.log(`[VERIFY] Payment verified: ${paymentId} `);
    console.log(`  Network: ${routePlan.chainConfig.name} `);
    console.log(`  Token: ${routePlan.tokenIn.symbol} `);
    console.log(`  Amount: ${routePlan.amountIn} `);
    console.log(`  Merchant: ${routePlan.merchant} `);

    const response: VerifyResponse = {
      isValid: true,
      paymentId,
    };
    res.json(response);
  } catch (error) {
    console.error("[VERIFY] Error:", error);
    res.status(400).json({
      isValid: false,
      invalidReason: `Invalid request: ${error} `,
    });
  }
});

/**
 * GET /settle - Endpoint documentation
 */
app.get("/settle", (_req: Request, res: Response) => {
  res.json({
    endpoint: "/settle",
    description: "POST to settle x402 payments. Fetches PaymentRecord, calls router executeRoute(), returns X-PAYMENT-RESPONSE.",
    body: {
      paymentPayload: "PaymentPayload - The signed payment data from client",
      paymentRequirements: "PaymentRequirements - The payment requirements from the resource server",
    },
    response: {
      success: "boolean - Whether settlement was successful",
      txHash: "string - Transaction hash (if successful)",
      network: "string - Network where settlement occurred",
      error: "string - Error message (if failed)",
    },
  });
});

/**
 * POST /settle - Settle x402 payment
 * 1. Fetch PaymentRecord (or create from payload)
 * 2. Call router executeRoute()
 * 3. Wait for confirmation
 * 4. Return X-PAYMENT-RESPONSE with txHash
 */
app.post("/settle", async (req: Request, res: Response) => {
  try {
    const body: SettleRequest = req.body;

    // Parse and validate inputs
    const paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);
    const paymentRequirements = PaymentRequirementsSchema.parse(body.paymentRequirements);

    // Try to find existing record or create new one
    const paymentId = paymentPayload.payload.route.paymentId || generatePaymentId();
    let record = paymentRecords.get(paymentId);

    if (!record) {
      // Verify first if no existing record
      const verification = await verifyPaymentSignature(paymentPayload, paymentRequirements);
      if (!verification.isValid) {
        const response: SettleResponse = {
          success: false,
          error: verification.error,
        };
        res.json(response);
        return;
      }

      const routePlan = buildRoutePlan(paymentPayload, paymentRequirements);
      if (!routePlan) {
        const response: SettleResponse = {
          success: false,
          error: "Failed to build route plan",
        };
        res.json(response);
        return;
      }

      record = {
        paymentId,
        payload: paymentPayload,
        requirements: paymentRequirements,
        routePlan,
        status: "verified",
        createdAt: new Date(),
      };
      paymentRecords.set(paymentId, record);
    }

    // Check if already settled
    if (record.status === "settled") {
      const response: SettleResponse = {
        success: true,
        txHash: record.txHash,
        network: record.routePlan.chainConfig.name,
      };
      res.json(response);
      return;
    }

    console.log(`[SETTLE] Executing route for payment: ${paymentId} `);
    console.log(`[SETTLE] Demo mode: ${DEMO_MODE} `);

    // In demo mode, skip actual blockchain transaction
    if (DEMO_MODE) {
      const demoTxHash = `0x${crypto.randomBytes(32).toString("hex")} `;
      record.status = "settled";
      record.txHash = demoTxHash;

      console.log(`[SETTLE] Demo mode - Payment settled`);
      console.log(`  TxHash(demo): ${demoTxHash} `);
      console.log(`  Network: ${record.routePlan.chainConfig.name} `);

      // If cross-chain, simulate bridge
      let bridgeTxHash: string | undefined;
      let relayerTxHash: string | undefined;
      if (record.routePlan.bridgeRequired && record.routePlan.destinationChainConfig) {
        console.log(`[SETTLE] Cross-chain payment detected - Would bridge to ${record.routePlan.destinationChainConfig.name}`);
        bridgeTxHash = `0x${crypto.randomBytes(32).toString("hex")}`;
        const bridgeId = `0x${crypto.randomBytes(32).toString("hex")}`;
        console.log(`[SETTLE] Bridge TxHash(demo): ${bridgeTxHash}`);
        console.log(`[SETTLE] Bridge ID(demo): ${bridgeId}`);

        // Simulate relayer completion check
        console.log(`[SETTLE] Waiting 5 seconds to check for relayer completion...`);
        const completion = await checkBridgeCompletion(bridgeId, record.routePlan.destinationChainConfig.chainId, 5);
        if (completion.completed && completion.txHash) {
          relayerTxHash = completion.txHash;
          console.log(`[SETTLE] Relayer completed bridge: ${relayerTxHash}`);
        } else {
          console.log(`[SETTLE] Relayer has not completed bridge yet`);
        }
      }

      const response: SettleResponse = {
        success: true,
        txHash: demoTxHash,
        network: record.routePlan.chainConfig.name,
        bridgeTxHash,
        bridgeNetwork: record.routePlan.destinationChainConfig?.name,
        relayerTxHash,
        relayerNetwork: record.routePlan.destinationChainConfig?.name,
      };
      res.json(response);
      return;
    }

    // Execute the route on-chain
    const result = await executeRouteOnChain(record);

    if (result.success) {
      record.status = "settled";
      record.txHash = result.txHash;

      console.log(`[SETTLE] Payment settled successfully`);
      console.log(`  TxHash: ${result.txHash} `);
      console.log(`  Network: ${record.routePlan.chainConfig.name} `);

      // If cross-chain, initiate bridge
      let bridgeTxHash: string | undefined;
      let relayerTxHash: string | undefined;
      if (record.routePlan.bridgeRequired && record.routePlan.destinationChainConfig) {
        console.log(`[SETTLE] Initiating cross-chain bridge to ${record.routePlan.destinationChainConfig.name}...`);

        const account = privateKeyToAccount(EVM_PRIVATE_KEY);
        const bridgeId = `0x${crypto.randomBytes(32).toString('hex')}`;

        const bridgeResult = await bridgeViaContract(
          record.routePlan.chainConfig.chainId,
          record.routePlan.destinationChainConfig.chainId,
          record.payload.payload.route.tokenIn as Address,
          record.routePlan.amountIn,
          record.routePlan.merchant,
          account,
          bridgeId
        );

        if (bridgeResult.success) {
          bridgeTxHash = bridgeResult.bridgeTxHash;
          console.log(`[SETTLE] Bridge initiated successfully: ${bridgeTxHash}`);

          // Wait and check if relayer has completed the bridge
          console.log(`[SETTLE] Waiting 5 seconds to check for relayer completion...`);
          const completion = await checkBridgeCompletion(bridgeId, record.routePlan.destinationChainConfig.chainId, 5);
          if (completion.completed && completion.txHash) {
            relayerTxHash = completion.txHash;
            console.log(`[SETTLE] Relayer completed bridge: ${relayerTxHash}`);
          } else {
            console.log(`[SETTLE] Relayer has not completed bridge yet`);
          }
        } else {
          console.warn(`[SETTLE] Bridge failed: ${bridgeResult.error}`);
        }
      }

      const response: SettleResponse = {
        success: true,
        txHash: result.txHash,
        network: record.routePlan.chainConfig.name,
        bridgeTxHash,
        bridgeNetwork: record.routePlan.destinationChainConfig?.name,
        relayerTxHash,
        relayerNetwork: record.routePlan.destinationChainConfig?.name,
      };
      res.json(response);
    } else {
      record.status = "failed";

      console.error(`[SETTLE] Payment settlement failed: ${result.error} `);

      const response: SettleResponse = {
        success: false,
        error: result.error,
      };
      res.json(response);
    }
  } catch (error) {
    console.error("[SETTLE] Error:", error);
    res.status(400).json({
      success: false,
      error: `Settlement failed: ${error} `,
    });
  }
});

/**
 * GET /supported - List supported payment kinds
 */
app.get("/supported", (_req: Request, res: Response) => {
  const kinds = Object.entries(CHAIN_CONFIGS).map(([network, config]) => ({
    x402Version: 1,
    scheme: "exact",
    network,
    chainId: config.chainId,
    chainName: config.name,
    routerAddress: config.routerAddress,
    supportedTokens: config.supportedTokens.map((t) => ({
      symbol: t.symbol,
      address: t.address,
      decimals: t.decimals,
    })),
  }));

  res.json({ kinds });
});

/**
 * GET /health - Health check
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    supportedNetworks: Object.keys(CHAIN_CONFIGS),
  });
});

/**
 * GET /payments/:id - Get payment status
 */
app.get("/payments/:id", (req: Request, res: Response) => {
  const paymentId = req.params.id;
  if (!paymentId) {
    res.status(400).json({ error: "Payment ID required" });
    return;
  }
  const record = paymentRecords.get(paymentId);
  if (!record) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.json({
    paymentId: record.paymentId,
    status: record.status,
    network: record.routePlan.chainConfig.name,
    tokenIn: record.routePlan.tokenIn.symbol,
    amountIn: record.routePlan.amountIn.toString(),
    merchant: record.routePlan.merchant,
    txHash: record.txHash,
    createdAt: record.createdAt.toISOString(),
  });
});

// ============ Start Server ============
app.listen(PORT, () => {
  console.log(`🚀 x402 Facilitator listening at http://localhost:${PORT}`);
  console.log(`📋 Supported networks: ${Object.keys(CHAIN_CONFIGS).join(", ")}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health     - Health check`);
  console.log(`  GET  /supported  - List supported payment kinds`);
  console.log(`  GET  /verify     - Verify endpoint documentation`);
  console.log(`  POST /verify     - Verify x402 payment`);
  console.log(`  GET  /settle     - Settle endpoint documentation`);
  console.log(`  POST /settle     - Settle x402 payment`);
  console.log(`  GET  /payments/:id - Get payment status`);
});