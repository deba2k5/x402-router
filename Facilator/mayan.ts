/**
 * Mayan Protocol Integration
 * 
 * This module handles cross-chain token bridging via Mayan Protocol.
 * Mayan is a production-grade bridge for multi-chain token transfers.
 * 
 * API Documentation: https://docs.mayan.finance/
 * 
 * Key Components:
 * 1. Quote API - Get bridge pricing and slippage
 * 2. Swap API - Execute the bridge transaction
 * 3. Status API - Check bridge completion
 */

import axios from 'axios';
import type { Address } from 'viem';

// Mayan API Base URL
const MAYAN_API_BASE = 'https://api.mayan.finance/v3';

// Supported chains in Mayan (chain names)
const CHAIN_NAME_MAP: Record<number, string> = {
  84532: 'base',           // Base Sepolia
  11155111: 'eth',         // Ethereum Sepolia
  421614: 'arbitrum',      // Arbitrum Sepolia
  11155420: 'optimism',    // Optimism Sepolia
};

export interface MayanQuoteRequest {
  sourceChainId: number;
  destChainId: number;
  tokenAddress: Address;
  amount: string; // In base units (wei)
  recipientAddress: Address;
}

export interface MayanQuoteResponse {
  swapId: string;
  quote: {
    amountOut: string;
    slippage: number;
    fee: string;
  };
  route: {
    steps: Array<{
      name: string;
      chainId: number;
      protocol: string;
    }>;
  };
}

export interface MayanBridgeRequest {
  swapId: string;
  userAddress: Address;
  recipientAddress: Address;
  // Additional params for transaction signing would go here
}

export interface MayanBridgeResponse {
  swapId: string;
  status: string; // 'pending' | 'completed' | 'failed'
  txHash: string;
  destinationTxHash?: string;
  amountOut: string;
  completedAt?: number;
}

/**
 * Get a bridge quote from Mayan Protocol
 * 
 * This gets pricing and routing information for a cross-chain bridge
 */
export async function getMayanQuote(
  request: MayanQuoteRequest
): Promise<MayanQuoteResponse> {
  try {
    // Map chain IDs to Mayan chain names
    const sourceChain = CHAIN_NAME_MAP[request.sourceChainId];
    const destChain = CHAIN_NAME_MAP[request.destChainId];

    if (!sourceChain || !destChain) {
      throw new Error(
        `Unsupported chain IDs: source=${request.sourceChainId}, dest=${request.destChainId}`
      );
    }

    // Call Mayan quote API
    const response = await axios.get(`${MAYAN_API_BASE}/quote`, {
      params: {
        sourceChain,
        destChain,
        token: request.tokenAddress,
        amount: request.amount,
        slippageBps: 50, // 0.5% slippage tolerance
      },
    });

    return {
      swapId: response.data.swapId,
      quote: {
        amountOut: response.data.amountOut,
        slippage: response.data.slippage,
        fee: response.data.fee,
      },
      route: {
        steps: response.data.route?.steps || [],
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Mayan quote failed: ${error.response?.data?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Execute a bridge transaction via Mayan Protocol
 * 
 * This initiates the actual bridge transfer between chains
 */
export async function executeMayanBridge(
  request: MayanBridgeRequest
): Promise<MayanBridgeResponse> {
  try {
    // Call Mayan swap API to execute bridge
    const response = await axios.post(`${MAYAN_API_BASE}/swap`, {
      swapId: request.swapId,
      userAddress: request.userAddress,
      recipientAddress: request.recipientAddress,
    });

    return {
      swapId: response.data.swapId,
      status: response.data.status,
      txHash: response.data.txHash,
      destinationTxHash: response.data.destinationTxHash,
      amountOut: response.data.amountOut,
      completedAt: response.data.completedAt,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Mayan bridge execution failed: ${error.response?.data?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Check the status of a bridge transaction
 * 
 * This polls the bridge status until completion
 */
export async function checkMayanBridgeStatus(
  swapId: string
): Promise<MayanBridgeResponse> {
  try {
    const response = await axios.get(`${MAYAN_API_BASE}/swap/${swapId}`);

    return {
      swapId: response.data.swapId,
      status: response.data.status,
      txHash: response.data.txHash,
      destinationTxHash: response.data.destinationTxHash,
      amountOut: response.data.amountOut,
      completedAt: response.data.completedAt,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to check Mayan bridge status: ${error.response?.data?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Poll Mayan bridge status until completion or timeout
 * 
 * This is useful for waiting on bridge completions
 */
export async function waitForMayanBridgeCompletion(
  swapId: string,
  maxWaitTime: number = 300000 // 5 minutes default
): Promise<MayanBridgeResponse> {
  const startTime = Date.now();
  const pollInterval = 5000; // Poll every 5 seconds

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await checkMayanBridgeStatus(swapId);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(`Bridge swap ${swapId} failed`);
      }

      // Still pending, wait and retry
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      // Continue polling on transient errors
      if (!(error instanceof Error && error.message.includes('HTTP'))) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error(`Bridge swap ${swapId} timed out after ${maxWaitTime}ms`);
}
