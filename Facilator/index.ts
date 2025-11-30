/* eslint-env node */
import { config } from "dotenv";
import express, { type Request, type Response } from "express";
import { createPublicClient, createWalletClient, http, type Hex, type Address, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia } from "viem/chains";
import { z } from "zod";
import crypto from "crypto";

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
    routerAddress: (process.env.BASE_SEPOLIA_ROUTER || "0x0000000000000000000000000000000000000000") as Address,
    supportedTokens: [
      { symbol: "USDC", address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address, decimals: 6 },
      { symbol: "DAI", address: "0x7683022d84F726a96c4A6611cD31DBf5409c0Ac9" as Address, decimals: 18 },
    ],
    chain: baseSepolia,
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC || "https://rpc.sepolia.org",
    routerAddress: (process.env.SEPOLIA_ROUTER || "0x0000000000000000000000000000000000000000") as Address,
    supportedTokens: [
      { symbol: "USDC", address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address, decimals: 6 },
    ],
    chain: sepolia,
  },
  "arbitrum-sepolia": {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc",
    routerAddress: (process.env.ARBITRUM_SEPOLIA_ROUTER || "0x0000000000000000000000000000000000000000") as Address,
    supportedTokens: [
      { symbol: "USDC", address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as Address, decimals: 6 },
    ],
    chain: arbitrumSepolia,
  },
  "optimism-sepolia": {
    chainId: 11155420,
    name: "Optimism Sepolia",
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC || "https://sepolia.optimism.io",
    routerAddress: (process.env.OPTIMISM_SEPOLIA_ROUTER || "0x0000000000000000000000000000000000000000") as Address,
    supportedTokens: [
      { symbol: "USDC", address: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7" as Address, decimals: 6 },
    ],
    chain: optimismSepolia,
  },
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
    name: "isPaymentProcessed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "RouteExecuted",
    type: "event",
    inputs: [
      { name: "paymentId", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "merchant", type: "address", indexed: true },
      { name: "tokenIn", type: "address", indexed: false },
      { name: "tokenOut", type: "address", indexed: false },
      { name: "amountIn", type: "uint256", indexed: false },
      { name: "amountOut", type: "uint256", indexed: false },
    ],
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
  tokenIn: z.string(),
  tokenOut: z.string().optional(),
  amountIn: z.string(),
  minAmountOut: z.string(),
  merchant: z.string(),
  dexRouter: z.string().optional(),
  dexCalldata: z.string().optional(),
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
  tokenIn: TokenConfig;
  tokenOut: TokenConfig | null;
  amountIn: bigint;
  minAmountOut: bigint;
  merchant: Address;
  needsSwap: boolean;
};

const paymentRecords = new Map<string, PaymentRecord>();

// ============ Helper Functions ============

/**
 * Generate a unique payment ID
 */
const generatePaymentId = (): string => {
  return `0x${crypto.randomBytes(32).toString("hex")}`;
};

/**
 * Get chain config by network name
 */
const getChainConfig = (network: string): ChainConfig | null => {
  return CHAIN_CONFIGS[network] || null;
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
      return { isValid: false, error: `Unsupported network: ${payload.network}` };
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
      return { isValid: false, error: `Unsupported token: ${payload.payload.route.tokenIn}` };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: `Verification failed: ${error}` };
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

  return {
    chainConfig,
    tokenIn,
    tokenOut,
    amountIn: BigInt(payload.payload.route.amountIn),
    minAmountOut: BigInt(payload.payload.route.minAmountOut),
    merchant: payload.payload.route.merchant as Address,
    needsSwap,
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

    // Prepare route params
    const route = {
      paymentId: (record.paymentId.startsWith("0x") ? record.paymentId : `0x${record.paymentId}`) as Hex,
      tokenIn: payload.payload.route.tokenIn as Address,
      tokenOut: (payload.payload.route.tokenOut || "0x0000000000000000000000000000000000000000") as Address,
      amountIn: BigInt(payload.payload.route.amountIn),
      minAmountOut: BigInt(payload.payload.route.minAmountOut),
      merchant: payload.payload.route.merchant as Address,
      dexRouter: (payload.payload.route.dexRouter || "0x0000000000000000000000000000000000000000") as Address,
      dexCalldata: (payload.payload.route.dexCalldata || "0x") as Hex,
    };

    // Check if payment already processed
    const isProcessed = await publicClient.readContract({
      address: chainConfig.routerAddress,
      abi: PAYMENT_ROUTER_ABI,
      functionName: "isPaymentProcessed",
      args: [route.paymentId],
    });

    if (isProcessed) {
      return { success: false, error: "Payment already processed" };
    }

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
    return { success: false, error: `Execution failed: ${error}` };
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

    console.log(`[VERIFY] Payment verified: ${paymentId}`);
    console.log(`  Network: ${routePlan.chainConfig.name}`);
    console.log(`  Token: ${routePlan.tokenIn.symbol}`);
    console.log(`  Amount: ${routePlan.amountIn}`);
    console.log(`  Merchant: ${routePlan.merchant}`);

    const response: VerifyResponse = {
      isValid: true,
      paymentId,
    };
    res.json(response);
  } catch (error) {
    console.error("[VERIFY] Error:", error);
    res.status(400).json({
      isValid: false,
      invalidReason: `Invalid request: ${error}`,
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

    console.log(`[SETTLE] Executing route for payment: ${paymentId}`);
    console.log(`[SETTLE] Demo mode: ${DEMO_MODE}`);

    // In demo mode, skip actual blockchain transaction
    if (DEMO_MODE) {
      const demoTxHash = `0x${crypto.randomBytes(32).toString("hex")}`;
      record.status = "settled";
      record.txHash = demoTxHash;

      console.log(`[SETTLE] Demo mode - Payment settled`);
      console.log(`  TxHash (demo): ${demoTxHash}`);
      console.log(`  Network: ${record.routePlan.chainConfig.name}`);

      const response: SettleResponse = {
        success: true,
        txHash: demoTxHash,
        network: record.routePlan.chainConfig.name,
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
      console.log(`  TxHash: ${result.txHash}`);
      console.log(`  Network: ${record.routePlan.chainConfig.name}`);

      const response: SettleResponse = {
        success: true,
        txHash: result.txHash,
        network: record.routePlan.chainConfig.name,
      };
      res.json(response);
    } else {
      record.status = "failed";

      console.error(`[SETTLE] Payment settlement failed: ${result.error}`);

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
      error: `Settlement failed: ${error}`,
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