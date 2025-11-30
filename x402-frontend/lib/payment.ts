'use client';

import { BrowserProvider, toBeHex } from 'ethers';

/**
 * X402 Payment Utility
 * Handles the complete payment flow for accessing protected resources
 */

// Extend Window interface for ethereum provider
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<string[]>;
      on?: (event: string, callback: (accounts: string[]) => void) => void;
    };
  }
}

export interface PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description?: string;
  mimeType?: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  asset: string;
  extra?: Record<string, unknown>;
}

export interface PermitData {
  token: string;
  owner: string;
  value: string;
  deadline: number;
  v: number;
  r: string;
  s: string;
}

export interface RouteParams {
  paymentId?: string;
  tokenIn: string;
  tokenOut?: string;
  amountIn: string;
  minAmountOut: string;
  merchant: string;
  dexRouter?: string;
  dexCalldata?: string;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: string;
    permit: PermitData;
    route: RouteParams;
  };
}

/**
 * Get the user's wallet address
 */
export async function getUserAddress(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('This function can only be called in the browser');
  }

  if (!window.ethereum) {
    throw new Error('MetaMask or similar wallet not found');
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return await signer.getAddress();
}

/**
 * Switch to the specified network
 */
export async function switchNetwork(chainId: number): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('This function can only be called in the browser');
  }

  if (!window.ethereum) {
    throw new Error('MetaMask or similar wallet not found');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: toBeHex(chainId) }],
    });
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 4902) {
      // Network not added to wallet
      throw new Error(`Network ${chainId} not found in wallet. Please add it manually.`);
    }
    throw error;
  }
}

/**
 * Generate EIP-712 signature for the payment
 */
export async function generatePaymentSignature(
  paymentPayload: Omit<PaymentPayload, 'payload'> & { payload: Omit<PaymentPayload['payload'], 'signature'> }
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('This function can only be called in the browser');
  }

  if (!window.ethereum) {
    throw new Error('MetaMask or similar wallet not found');
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Create the message to sign
  const messageToSign = JSON.stringify({
    scheme: paymentPayload.scheme,
    network: paymentPayload.network,
    route: paymentPayload.payload.route,
    timestamp: Date.now(),
  });

  // Sign the message
  const signature = await signer.signMessage(messageToSign);
  return signature;
}

/**
 * Verify payment with the backend facilitator
 */
export async function verifyPayment(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
  backendUrl: string = 'http://localhost:3001'
): Promise<{ isValid: boolean; paymentId?: string; error?: string }> {
  try {
    const response = await fetch(`${backendUrl}/api/x402/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        isValid: false,
        error: data.error || 'Verification failed',
      };
    }

    return {
      isValid: data.isValid,
      paymentId: data.paymentId,
      error: data.error,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Settle payment on-chain through the facilitator
 */
export async function settlePayment(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
  backendUrl: string = 'http://localhost:3001'
): Promise<{ success: boolean; paymentId?: string; txHash?: string; error?: string }> {
  try {
    const response = await fetch(`${backendUrl}/api/x402/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Settlement failed',
      };
    }

    return {
      success: data.success,
      paymentId: data.paymentId,
      txHash: data.txHash,
      error: data.error,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get supported networks and tokens from facilitator
 */
export async function getSupportedNetworks(
  backendUrl: string = 'http://localhost:3001'
): Promise<{ kinds: Array<{ network: string; chainId: number; chainName: string; supportedTokens: Array<{ symbol: string; address: string; decimals: number }> }> }> {
  try {
    const response = await fetch(`${backendUrl}/api/x402/supported`);
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`Failed to fetch supported networks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get payment requirements from backend
 */
export async function getPaymentRequirements(
  backendUrl: string = 'http://localhost:3001'
): Promise<PaymentRequirements> {
  try {
    const response = await fetch(`${backendUrl}/api/payment-requirements`);
    const data = await response.json();
    return data.paymentRequirements;
  } catch (error) {
    throw new Error(`Failed to fetch payment requirements: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a payment payload for a specific route and amount
 */
export async function createPaymentPayload(
  tokenAddress: string,
  amountIn: string,
  minAmountOut: string,
  merchantAddress: string,
  chainNetwork: string,
  permitDeadline: number,
  permitSignature?: { v: number; r: string; s: string }
): Promise<Omit<PaymentPayload, 'payload'> & { payload: Omit<PaymentPayload['payload'], 'signature'> }> {
  const userAddress = await getUserAddress();

  // Generate payment ID
  const paymentId = `0x${Math.random().toString(16).slice(2)}`;

  return {
    x402Version: 1,
    scheme: 'exact',
    network: chainNetwork,
    payload: {
      permit: {
        token: tokenAddress,
        owner: userAddress,
        value: amountIn,
        deadline: permitDeadline,
        v: permitSignature?.v || 0,
        r: permitSignature?.r || '0x',
        s: permitSignature?.s || '0x',
      },
      route: {
        paymentId,
        tokenIn: tokenAddress,
        tokenOut: tokenAddress, // same token, no swap
        amountIn,
        minAmountOut,
        merchant: merchantAddress,
        dexRouter: '0x0000000000000000000000000000000000000000',
        dexCalldata: '0x',
      },
    },
  };
}

/**
 * Complete payment flow: verify -> settle
 */
export async function processPayment(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
  backendUrl: string = 'http://localhost:3001'
): Promise<{
  success: boolean;
  paymentId?: string;
  txHash?: string;
  paymentResponse?: string;
  error?: string;
}> {
  try {
    // Step 1: Verify payment
    const verifyResult = await verifyPayment(paymentPayload, paymentRequirements, backendUrl);
    if (!verifyResult.isValid) {
      return {
        success: false,
        error: verifyResult.error || 'Payment verification failed',
      };
    }

    const paymentId = verifyResult.paymentId;
    console.log('[X402] Payment verified:', paymentId);

    // Step 2: Settle payment
    const settleResult = await settlePayment(paymentPayload, paymentRequirements, backendUrl);
    if (!settleResult.success) {
      return {
        success: false,
        error: settleResult.error || 'Payment settlement failed',
      };
    }

    console.log('[X402] Payment settled:', settleResult.txHash);

    return {
      success: true,
      paymentId,
      txHash: settleResult.txHash,
      paymentResponse: paymentId, // Use paymentId as payment response header
    };
  } catch (error) {
    return {
      success: false,
      error: `Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Call a protected API endpoint with payment proof
 */
export async function callProtectedEndpoint(
  endpoint: string,
  paymentResponse: string,
  options: RequestInit = {},
  backendUrl: string = 'http://localhost:3001'
): Promise<Response> {
  const headers = {
    ...options.headers,
    'X-PAYMENT-RESPONSE': paymentResponse,
    'Content-Type': 'application/json',
  };

  return fetch(`${backendUrl}${endpoint}`, {
    ...options,
    headers,
  });
}
