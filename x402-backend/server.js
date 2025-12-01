const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:3000';

// Relayer address that receives payments
const RELAYER_ADDRESS = process.env.MERCHANT_ADDRESS || '0x95Cf028D5e86863570E300CAD14484Dc2068eB79';

// PaymentRouter contract addresses for each network
const PAYMENT_ROUTER_ADDRESSES = {
  84532: '0xC858560Ac08048258e57a1c6C47dAf682fC25F62',        // Base Sepolia
  11155111: '0x0E8b303b5245f7ba924Aadf5828226c7d35e3e13',    // Ethereum Sepolia
  421614: '0x404A674a52f85789a71D530af705f2f458bc5284',      // Arbitrum Sepolia
  11155420: '0xC49568398F909aF8D40Cf27B26780e1B5Ca5996F',    // Optimism Sepolia
};

// Middleware
app.use(cors());
app.use(express.json());

// ============ X402 Payment Configuration ============
const PAYMENT_CONFIG = {
  'image-generation': {
    price: '1000000', // 1 USDC (6 decimals)
    description: 'AI Image Generation Service',
    asset: 'USDC',
  },
  'location-suggestions': {
    price: '500000', // 0.5 USDC (6 decimals)
    description: 'Location-Based AI Suggestions',
    asset: 'USDC',
  },
};

// Supported chains and their USDC addresses
const SUPPORTED_CHAINS = {
  'base-sepolia': { chainId: 84532, usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' },
  'sepolia': { chainId: 11155111, usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
  'arbitrum-sepolia': { chainId: 421614, usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' },
  'optimism-sepolia': { chainId: 11155420, usdc: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7' },
};

// In-memory store for verified payments
const verifiedPayments = new Map();

/**
 * Generate Payment Requirements for X402
 */
const generatePaymentRequirements = (service, resource) => {
  const config = PAYMENT_CONFIG[service];
  if (!config) return null;

  return {
    x402Version: 1,
    scheme: 'exact',
    networks: Object.keys(SUPPORTED_CHAINS),
    maxAmountRequired: config.price,
    resource: resource,
    description: config.description,
    payTo: RELAYER_ADDRESS,
    asset: config.asset,
    supportedAssets: Object.entries(SUPPORTED_CHAINS).map(([network, info]) => ({
      network,
      chainId: info.chainId,
      asset: info.usdc,
      symbol: 'USDC',
      decimals: 6,
    })),
    maxTimeoutSeconds: 3600,
  };
};

/**
 * Middleware to check X402 payment
 */
const requirePayment = (service) => async (req, res, next) => {
  const xPayment = req.headers['x-payment'];
  const xPaymentPermit = req.headers['x-payment-permit'];
  const xPaymentRoute = req.headers['x-payment-route'];
  const xPaymentResponse = req.headers['x-payment-response'];

  // If no payment header, return 402 Payment Required
  if (!xPayment && (!xPaymentPermit || !xPaymentRoute) && !xPaymentResponse) {
    const paymentRequirements = generatePaymentRequirements(service, req.originalUrl);
    return res.status(402).json({
      error: 'Payment required',
      message: 'This is a premium API endpoint. Please complete payment to access.',
      paymentRequirements,
      instructions: {
        step1: 'Connect your wallet on the frontend',
        step2: 'Sign the payment permit',
        step3: 'Include the X-PAYMENT header with your signed payload, or X-PAYMENT-PERMIT and X-PAYMENT-ROUTE headers',
      },
    });
  }

  try {
    // Parse payment payload
    let paymentPayload;

    if (xPaymentPermit && xPaymentRoute) {
      // New format
      const permit = JSON.parse(xPaymentPermit);
      const route = JSON.parse(xPaymentRoute);

      // Use sourceNetwork from route if available, otherwise default
      const network = route.sourceNetwork || req.body.network || 'base-sepolia';

      paymentPayload = {
        network: network,
        x402Version: 1,
        scheme: "exact",
        payload: {
          permit,
          route,
          signature: `0x${permit.r.slice(2)}${permit.s.slice(2)}${permit.v.toString(16)}` // Reconstruct signature for logs if needed
        }
      };

      // Infer network from chainId in permit if possible, or use default
      // For now we trust the route params or default
    } else {
      // Legacy X-PAYMENT header
      try {
        paymentPayload = JSON.parse(Buffer.from(xPayment, 'base64').toString('utf-8'));
      } catch {
        paymentPayload = JSON.parse(xPayment);
      }
    }

    console.log(`[X402] Payment payload received:`, JSON.stringify({
      network: paymentPayload.network,
      owner: paymentPayload.payload?.permit?.owner,
      merchant: paymentPayload.payload?.route?.merchant,
      amount: paymentPayload.payload?.route?.amountIn,
      tokenIn: paymentPayload.payload?.route?.tokenIn,
    }, null, 2));

    const paymentRequirements = generatePaymentRequirements(service, req.originalUrl);

    // If we have X-PAYMENT-RESPONSE, payment was already settled
    if (xPaymentResponse) {
      let paymentResponse;
      try {
        paymentResponse = JSON.parse(Buffer.from(xPaymentResponse, 'base64').toString('utf-8'));
      } catch {
        paymentResponse = JSON.parse(xPaymentResponse);
      }

      if (paymentResponse.success && paymentResponse.txHash) {
        console.log(`[X402] Payment already settled: ${paymentResponse.txHash}`);
        req.paymentInfo = paymentResponse;
        return next();
      }
    }

    // Verify the payment with facilitator
    console.log(`[X402] Verifying payment with facilitator...`);
    const verifyResponse = await axios.post(`${FACILITATOR_URL}/verify`, {
      paymentPayload,
      paymentRequirements: {
        ...paymentRequirements,
        network: paymentPayload.network,
        asset: SUPPORTED_CHAINS[paymentPayload.network]?.usdc || paymentRequirements.asset,
      },
    });

    if (!verifyResponse.data.isValid) {
      return res.status(402).json({
        error: 'Payment verification failed',
        reason: verifyResponse.data.invalidReason,
        paymentRequirements,
      });
    }

    console.log(`[X402] Payment verified: ${verifyResponse.data.paymentId}`);

    // Settle the payment with facilitator
    console.log(`[X402] Settling payment...`);
    const settleResponse = await axios.post(`${FACILITATOR_URL}/settle`, {
      paymentPayload,
      paymentRequirements: {
        ...paymentRequirements,
        network: paymentPayload.network,
        asset: SUPPORTED_CHAINS[paymentPayload.network]?.usdc || paymentRequirements.asset,
      },
    });

    if (!settleResponse.data.success) {
      // For demo mode, allow through if it's just a contract issue
      if (settleResponse.data.error?.includes('Execution failed') ||
        settleResponse.data.error?.includes('0x000000')) {
        console.log(`[X402] Demo mode: Allowing through despite contract error`);
        req.paymentInfo = {
          success: true,
          paymentId: verifyResponse.data.paymentId,
          network: paymentPayload.network,
          demo: true,
        };
        return next();
      }

      return res.status(402).json({
        error: 'Payment settlement failed',
        reason: settleResponse.data.error,
        paymentRequirements,
      });
    }

    console.log(`[X402] Payment settled: ${settleResponse.data.txHash}`);

    // Store payment info and proceed
    req.paymentInfo = {
      success: true,
      paymentId: verifyResponse.data.paymentId,
      txHash: settleResponse.data.txHash,
      network: settleResponse.data.network,
    };

    // Set response header with payment confirmation
    res.setHeader('X-PAYMENT-RESPONSE', Buffer.from(JSON.stringify(req.paymentInfo)).toString('base64'));

    next();
  } catch (error) {
    console.error('[X402] Payment processing error:', error.message);

    // If facilitator is not running, allow demo mode
    if (error.code === 'ECONNREFUSED') {
      console.log('[X402] Facilitator not available - Demo mode enabled');
      req.paymentInfo = { demo: true, message: 'Facilitator not available' };
      return next();
    }

    const paymentRequirements = generatePaymentRequirements(service, req.originalUrl);
    return res.status(402).json({
      error: 'Payment processing failed',
      message: error.message,
      paymentRequirements,
    });
  }
};

// ============ Routes ============
const aiRoutes = require('./routes/ai');

// Health check (public)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'X402 Protocol Backend is running',
    facilitatorUrl: FACILITATOR_URL,
    relayerAddress: RELAYER_ADDRESS,
    paymentRouterAddresses: PAYMENT_ROUTER_ADDRESSES,
  });
});

// Get payment requirements (public)
app.get('/api/payment-requirements/:service', (req, res) => {
  const { service } = req.params;
  const requirements = generatePaymentRequirements(service, `/api/ai/${service}`);

  if (!requirements) {
    return res.status(404).json({ error: 'Service not found' });
  }

  res.json(requirements);
});

// Protected AI routes with X402 payment
// Apply specific payment requirements for each endpoint
app.post('/api/ai/image-generation', requirePayment('image-generation'));
app.post('/api/ai/location-suggestions', requirePayment('location-suggestions'));

// Mount the AI router for all /api/ai routes
app.use('/api/ai', aiRoutes);

// Status endpoint (public)
app.get('/api/ai/status', (req, res, next) => {
  // Forward to AI routes
  req.url = '/status';
  aiRoutes(req, res, next);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 X402 Protocol Backend running on port ${PORT}`);
  console.log(`🔗 API available at http://localhost:${PORT}`);
  console.log(`💰 Facilitator URL: ${FACILITATOR_URL}`);
  console.log(`\n📋 Protected Endpoints (require X402 payment):`);
  console.log(`   POST /api/ai/image-generation - 1 USDC`);
  console.log(`   POST /api/ai/location-suggestions - 0.5 USDC`);
});
