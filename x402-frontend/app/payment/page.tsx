"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../components/Header";
import { useAccount, useChainId, useSwitchChain, useSignTypedData } from "wagmi";
import { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia } from "viem/chains";
import { parseUnits, type Address } from "viem";

// Chain configurations matching the facilitator
const CHAIN_CONFIGS = {
  "base-sepolia": {
    chainId: 84532,
    name: "Base Sepolia",
    chain: baseSepolia,
    tokens: [
      { symbol: "USDC", address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address, decimals: 6 },
      { symbol: "DAI", address: "0x7683022d84F726a96c4A6611cD31DBf5409c0Ac9" as Address, decimals: 18 },
    ],
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    chain: sepolia,
    tokens: [
      { symbol: "USDC", address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address, decimals: 6 },
    ],
  },
  "arbitrum-sepolia": {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    tokens: [
      { symbol: "USDC", address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as Address, decimals: 6 },
    ],
  },
  "optimism-sepolia": {
    chainId: 11155420,
    name: "Optimism Sepolia",
    chain: optimismSepolia,
    tokens: [
      { symbol: "USDC", address: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7" as Address, decimals: 6 },
    ],
  },
};

type NetworkKey = keyof typeof CHAIN_CONFIGS;
type LogEntry = {
  timestamp: Date;
  type: "info" | "success" | "error" | "pending";
  message: string;
};

export default function PaymentPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();

  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>("base-sepolia");
  const [selectedToken, setSelectedToken] = useState(CHAIN_CONFIGS["base-sepolia"].tokens[0]);
  const [amount, setAmount] = useState("1");
  const [merchantAddress, setMerchantAddress] = useState("0x742d35Cc6634C0532925a3b844Bc9e7595f0Ab0b");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // Update token when network changes
  useEffect(() => {
    const networkConfig = CHAIN_CONFIGS[selectedNetwork];
    setSelectedToken(networkConfig.tokens[0]);
  }, [selectedNetwork]);

  const addLog = (type: LogEntry["type"], message: string) => {
    setLogs((prev) => [...prev, { timestamp: new Date(), type, message }]);
  };

  const handleNetworkChange = async (network: NetworkKey) => {
    setSelectedNetwork(network);
    const targetChainId = CHAIN_CONFIGS[network].chainId;
    
    if (chainId !== targetChainId && isConnected) {
      try {
        await switchChain({ chainId: targetChainId });
        addLog("success", `Switched to ${CHAIN_CONFIGS[network].name}`);
      } catch (error) {
        addLog("error", `Failed to switch network: ${error}`);
      }
    }
  };

  const generatePaymentId = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleExecutePayment = async () => {
    if (!isConnected || !address) {
      addLog("error", "Please connect your wallet first");
      return;
    }

    setLoading(true);
    setLogs([]);
    setPaymentResult(null);

    try {
      const networkConfig = CHAIN_CONFIGS[selectedNetwork];
      const paymentId = generatePaymentId();
      const amountInWei = parseUnits(amount, selectedToken.decimals);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      addLog("info", `Payment ID: ${paymentId.slice(0, 18)}...`);
      addLog("info", `Network: ${networkConfig.name}`);
      addLog("info", `Token: ${selectedToken.symbol}`);
      addLog("info", `Amount: ${amount} ${selectedToken.symbol}`);

      // Check if we need to switch chains
      if (chainId !== networkConfig.chainId) {
        addLog("pending", "Switching to correct network...");
        await switchChain({ chainId: networkConfig.chainId });
        addLog("success", `Switched to ${networkConfig.name}`);
      }

      // Sign the permit (EIP-2612)
      addLog("pending", "Requesting permit signature...");

      const permitDomain = {
        name: selectedToken.symbol,
        version: "1",
        chainId: BigInt(networkConfig.chainId),
        verifyingContract: selectedToken.address,
      };

      const permitTypes = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const permitMessage = {
        owner: address,
        spender: merchantAddress as Address, // Router contract would be spender in production
        value: amountInWei,
        nonce: BigInt(0), // In production, fetch actual nonce from contract
        deadline: BigInt(deadline),
      };

      const signature = await signTypedDataAsync({
        domain: permitDomain,
        types: permitTypes,
        primaryType: "Permit",
        message: permitMessage,
      });

      addLog("success", "Permit signature obtained");

      // Parse signature
      const r = signature.slice(0, 66);
      const s = "0x" + signature.slice(66, 130);
      const v = parseInt(signature.slice(130, 132), 16);

      // Build payment payload
      const paymentPayload = {
        x402Version: 1,
        scheme: "exact",
        network: selectedNetwork,
        payload: {
          signature,
          permit: {
            token: selectedToken.address,
            owner: address,
            value: amountInWei.toString(),
            deadline,
            v,
            r,
            s,
          },
          route: {
            paymentId,
            tokenIn: selectedToken.address,
            tokenOut: "", // Same token, no swap
            amountIn: amountInWei.toString(),
            minAmountOut: amountInWei.toString(),
            merchant: merchantAddress,
            dexRouter: "",
            dexCalldata: "",
          },
        },
      };

      const paymentRequirements = {
        scheme: "exact",
        network: selectedNetwork,
        maxAmountRequired: amountInWei.toString(),
        resource: "/api/ai/image-generation",
        description: "AI Image Generation Service",
        payTo: merchantAddress,
        asset: selectedToken.address,
      };

      // Step 1: Verify payment with facilitator
      addLog("pending", "Verifying payment with facilitator...");
      
      const verifyResponse = await fetch("http://localhost:3000/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentPayload, paymentRequirements }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResult.isValid) {
        throw new Error(verifyResult.invalidReason || "Payment verification failed");
      }

      addLog("success", `Payment verified! ID: ${verifyResult.paymentId?.slice(0, 18)}...`);

      // Step 2: Settle payment
      addLog("pending", "Settling payment on-chain...");

      const settleResponse = await fetch("http://localhost:3000/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentPayload, paymentRequirements }),
      });

      const settleResult = await settleResponse.json();

      if (!settleResult.success) {
        throw new Error(settleResult.error || "Payment settlement failed");
      }

      addLog("success", `Payment settled successfully!`);
      addLog("success", `TX Hash: ${settleResult.txHash}`);
      addLog("success", `Network: ${settleResult.network}`);

      setPaymentResult({
        paymentId,
        txHash: settleResult.txHash,
        network: settleResult.network,
        amount: `${amount} ${selectedToken.symbol}`,
        status: "completed",
      });

    } catch (error: any) {
      addLog("error", `Payment failed: ${error.message}`);
      setPaymentResult({ status: "failed", error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="max-w-6xl mx-auto p-8 pt-24">
        <div className="mb-8">
          <Link 
            href="/"
            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            X402 Payment
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Execute multi-chain payments with the X402 protocol
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Payment Details
            </h2>

            <div className="space-y-6">
              {/* Network Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Chain
                </label>
                <select
                  value={selectedNetwork}
                  onChange={(e) => handleNetworkChange(e.target.value as NetworkKey)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  {Object.entries(CHAIN_CONFIGS).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Token Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Token
                </label>
                <select
                  value={selectedToken.symbol}
                  onChange={(e) => {
                    const token = CHAIN_CONFIGS[selectedNetwork].tokens.find(
                      (t) => t.symbol === e.target.value
                    );
                    if (token) setSelectedToken(token);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  {CHAIN_CONFIGS[selectedNetwork].tokens.map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    {selectedToken.symbol}
                  </span>
                </div>
              </div>

              {/* Merchant Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Merchant Address
                </label>
                <input
                  type="text"
                  value={merchantAddress}
                  onChange={(e) => setMerchantAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                />
              </div>

              {/* Execute Button */}
              <button
                onClick={handleExecutePayment}
                disabled={loading || !isConnected}
                className="w-full px-6 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : !isConnected ? (
                  "Connect Wallet to Continue"
                ) : (
                  "Execute Payment"
                )}
              </button>

              {!isConnected && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Please connect your wallet using the button in the header
                </p>
              )}
            </div>
          </div>

          {/* Logs Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Transaction Logs
            </h2>

            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <p className="text-gray-500">Waiting for payment execution...</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 ${
                        log.type === "success"
                          ? "text-green-400"
                          : log.type === "error"
                          ? "text-red-400"
                          : log.type === "pending"
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                    >
                      <span className="text-gray-500 text-xs">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span>
                        {log.type === "success" && "✓ "}
                        {log.type === "error" && "✗ "}
                        {log.type === "pending" && "⏳ "}
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Result */}
            {paymentResult && paymentResult.status === "completed" && (
              <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <h3 className="font-semibold text-green-800 dark:text-green-400 mb-2">
                  Payment Successful! 🎉
                </h3>
                <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <p><strong>Payment ID:</strong> {paymentResult.paymentId?.slice(0, 18)}...</p>
                  <p><strong>Amount:</strong> {paymentResult.amount}</p>
                  <p><strong>Network:</strong> {paymentResult.network}</p>
                  <p className="break-all">
                    <strong>TX Hash:</strong>{" "}
                    <a 
                      href={`https://sepolia.basescan.org/tx/${paymentResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-green-500"
                    >
                      {paymentResult.txHash}
                    </a>
                  </p>
                </div>
              </div>
            )}

            {paymentResult && paymentResult.status === "failed" && (
              <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <h3 className="font-semibold text-red-800 dark:text-red-400 mb-2">
                  Payment Failed
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {paymentResult.error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chain Info */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(CHAIN_CONFIGS).map(([key, config]) => (
            <div
              key={key}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedNetwork === key
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              }`}
            >
              <h4 className="font-semibold text-gray-900 dark:text-white">{config.name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Chain ID: {config.chainId}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tokens: {config.tokens.map((t) => t.symbol).join(", ")}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
