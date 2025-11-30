'use client';

import React, { useState, useEffect } from 'react';
import {
  PaymentRequirements,
  PaymentPayload,
  getSupportedNetworks,
  getUserAddress,
  switchNetwork,
  generatePaymentSignature,
  createPaymentPayload,
  processPayment,
} from '@/lib/payment';

interface PaymentModalProps {
  isOpen: boolean;
  paymentRequirements: PaymentRequirements;
  onClose: () => void;
  onPaymentSuccess: (paymentResponse: string, txHash?: string) => void;
  backendUrl?: string;
}

type PaymentStatus = 'idle' | 'selecting' | 'preparing' | 'signing' | 'verifying' | 'settling' | 'success' | 'error';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  paymentRequirements,
  onClose,
  onPaymentSuccess,
  backendUrl = 'http://localhost:3001',
}) => {
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [supportedNetworks, setSupportedNetworks] = useState<
    Array<{ network: string; chainId: number; chainName: string; supportedTokens: Array<{ symbol: string; address: string; decimals: number }> }>
  >([]);
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Load supported networks on mount
  useEffect(() => {
    if (!isOpen) return;

    const loadNetworks = async () => {
      try {
        const data = await getSupportedNetworks(backendUrl);
        setSupportedNetworks(data.kinds || []);

        // Auto-select first network and token
        if (data.kinds && data.kinds.length > 0) {
          const firstNetwork = data.kinds[0];
          setSelectedNetwork(firstNetwork.network);
          if (firstNetwork.supportedTokens && firstNetwork.supportedTokens.length > 0) {
            setSelectedToken(firstNetwork.supportedTokens[0].address);
          }
        }
      } catch (err) {
        setError(`Failed to load supported networks: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    loadNetworks();
  }, [isOpen, backendUrl]);

  const handlePayment = async () => {
    if (!selectedNetwork || !selectedToken) {
      setError('Please select a network and token');
      return;
    }

    try {
      setLoading(true);
      setStatus('preparing');
      setError('');

      // Get current user address (will be used in createPaymentPayload)
      await getUserAddress();

      // Find network chain ID
      const networkConfig = supportedNetworks.find((n) => n.network === selectedNetwork);
      if (!networkConfig) {
        throw new Error('Network configuration not found');
      }

      // Switch to selected network
      setStatus('selecting');
      await switchNetwork(networkConfig.chainId);

      // Create payment payload
      setStatus('preparing');
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

      const payloadWithoutSignature = await createPaymentPayload(
        selectedToken,
        paymentRequirements.maxAmountRequired,
        paymentRequirements.maxAmountRequired, // minAmountOut = amountIn (no slippage for demo)
        paymentRequirements.payTo,
        selectedNetwork,
        deadline
      );

      // Generate signature
      setStatus('signing');
      const signature = await generatePaymentSignature(payloadWithoutSignature);

      const fullPayload: PaymentPayload = {
        ...payloadWithoutSignature,
        payload: {
          ...payloadWithoutSignature.payload,
          signature,
        },
      };

      // Process payment (verify + settle)
      setStatus('verifying');
      const result = await processPayment(fullPayload, paymentRequirements, backendUrl);

      if (!result.success) {
        throw new Error(result.error || 'Payment processing failed');
      }

      setStatus('success');
      setTxHash(result.txHash || '');

      // Call success callback
      if (result.paymentResponse) {
        setTimeout(() => {
          onPaymentSuccess(result.paymentResponse!, result.txHash);
          onClose();
        }, 2000);
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentNetworkConfig = supportedNetworks.find((n) => n.network === selectedNetwork);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {status === 'success' ? '✅ Payment Successful' : '💳 Payment Required'}
          </h2>
          {status !== 'success' && (
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-2xl disabled:opacity-50"
            >
              ×
            </button>
          )}
        </div>

        {/* Status Message */}
        {status === 'success' && (
          <div className="space-y-4">
            <p className="text-green-600 dark:text-green-400 text-center">Payment processed successfully!</p>
            {txHash && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Transaction Hash:</p>
                <p className="text-xs font-mono text-green-700 dark:text-green-400 break-all">{txHash}</p>
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Redirecting...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 rounded p-4">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
            <button
              onClick={() => {
                setStatus('idle');
                setError('');
              }}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Close
            </button>
          </div>
        )}

        {status !== 'success' && status !== 'error' && (
          <div className="space-y-6">
            {/* Network Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Select Network
              </label>
              <select
                value={selectedNetwork}
                onChange={(e) => {
                  setSelectedNetwork(e.target.value);
                  const network = supportedNetworks.find((n) => n.network === e.target.value);
                  if (network?.supportedTokens.length ?? 0 > 0) {
                    setSelectedToken(network!.supportedTokens[0].address);
                  }
                }}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              >
                {supportedNetworks.map((network) => (
                  <option key={network.network} value={network.network}>
                    {network.chainName} (Chain ID: {network.chainId})
                  </option>
                ))}
              </select>
            </div>

            {/* Token Selection */}
            {currentNetworkConfig && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Select Token
                </label>
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                >
                  {currentNetworkConfig.supportedTokens.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol} ({token.address.slice(0, 6)}...{token.address.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {(parseInt(paymentRequirements.maxAmountRequired) / Math.pow(10, 6)).toFixed(2)} {paymentRequirements.asset}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Resource:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{paymentRequirements.resource}</span>
              </div>
            </div>

            {/* Status Indicator */}
            {loading && (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {status === 'selecting' && 'Switching network...'}
                  {status === 'preparing' && 'Preparing payment...'}
                  {status === 'signing' && 'Sign transaction in wallet...'}
                  {status === 'verifying' && 'Verifying payment...'}
                  {status === 'settling' && 'Settling on-chain...'}
                </span>
              </div>
            )}

            {/* Error Display */}
            {error && status === 'idle' && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded p-3">
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePayment}
                disabled={loading || !selectedNetwork || !selectedToken}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Pay Now'}
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
