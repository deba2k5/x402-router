"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import { useAccount, useChainId, useSwitchChain, useSignTypedData } from "wagmi";
import { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia } from "viem/chains";
import { type Address } from "viem";

const FACILITATOR_URL = process.env.NEXT_PUBLIC_FACILITATOR_URL || "http://localhost:3000";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const RELAYER_ADDRESS = "0x95Cf028D5e86863570E300CAD14484Dc2068eB79" as Address;

// Chain configurations with deployed PaymentRouter and token addresses
const CHAIN_CONFIGS: Record<string, { chainId: number; name: string; chain: any; paymentRouter: Address; usdc: Address }> = {
  "base-sepolia": {
    chainId: 84532,
    name: "Base Sepolia",
    chain: baseSepolia,
    paymentRouter: "0x12B57C8615aD34469e1388F1CEb700F8f416BC80" as Address,
    usdc: "0x2b23c6e36b46cC013158Bc2869D686023FA85422" as Address
  },
  "sepolia": {
    chainId: 11155111,
    name: "Sepolia",
    chain: sepolia,
    paymentRouter: "0xAf83302a062bDEfC42e12d09E7Dd3e4374998F70" as Address,
    usdc: "0xc505D038fe2901fe624E6450887373BaA29e455F" as Address
  },
  "arbitrum-sepolia": {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    paymentRouter: "0xC49568398F909aF8D40Cf27B26780e1B5Ca5996F" as Address,
    usdc: "0x7b926C6038a23c3E26F7f36DcBec7606BAF44434" as Address
  },
  "optimism-sepolia": {
    chainId: 11155420,
    name: "Optimism Sepolia",
    chain: optimismSepolia,
    paymentRouter: "0xeeC4119F3B69A61744073BdaEd83421F4b29961E" as Address,
    usdc: "0x281Ae468d00040BCbB4685972F51f87d473420F7" as Address
  },
};

type LogEntry = { timestamp: Date; type: "info" | "success" | "error" | "pending"; message: string };

export default function LocationSuggestionsPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();

  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("base-sepolia");
  const [destinationNetwork, setDestinationNetwork] = useState<string>("base-sepolia");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paymentRequired, setPaymentRequired] = useState<any>(null);
  const [isPaid, setIsPaid] = useState(false);

  const addLog = (type: LogEntry["type"], message: string) => {
    setLogs((prev) => [...prev, { timestamp: new Date(), type, message }]);
  };

  const generatePaymentId = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // Check if service requires payment
  const checkPaymentRequired = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/location-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "test" }),
      });

      if (response.status === 402) {
        const data = await response.json();
        setPaymentRequired(data.paymentRequirements);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error checking payment:", err);
      return false;
    }
  };

  useEffect(() => {
    checkPaymentRequired();
  }, []);

  const handlePayAndGenerate = async () => {
    if (!query.trim()) {
      setError("Please enter your preferences");
      return;
    }

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setLogs([]);

    try {
      const networkConfig = CHAIN_CONFIGS[selectedNetwork];
      const paymentId = generatePaymentId();
      const amount = "500000"; // 0.5 USDC
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const paymentRouterAddress = networkConfig.paymentRouter; // Spender in permit

      addLog("info", `Starting X402 Payment Flow`);
      addLog("info", `Network: ${networkConfig.name}`);
      addLog("info", `Amount: 0.5 USDC`);
      addLog("info", `User Address: ${address}`);
      addLog("info", `PaymentRouter (Spender): ${paymentRouterAddress}`);

      // Switch chain if needed
      if (chainId !== networkConfig.chainId) {
        addLog("pending", "Switching network...");
        await switchChain({ chainId: networkConfig.chainId });

        // Wait for wallet to update state
        addLog("pending", "Waiting for network switch...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        addLog("success", `Switched to ${networkConfig.name}`);
      }

      // Fetch current nonce from Token contract
      addLog("pending", `Fetching USDC permit nonce...`);

      const { createPublicClient, http } = await import('viem');
      const publicClient = createPublicClient({
        chain: networkConfig.chain,
        transport: http(),
      });

      const currentNonce = await publicClient.readContract({
        address: networkConfig.usdc,
        abi: [
          {
            name: 'nonces',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'owner', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          },
        ],
        functionName: 'nonces',
        args: [address],
      });

      addLog("success", `Current nonce: ${currentNonce}`);

      // Sign permit
      addLog("pending", "Requesting signature...");

      const permitDomain = {
        name: "Mock USDC",
        version: "1",
        chainId: BigInt(networkConfig.chainId),
        verifyingContract: networkConfig.usdc,
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
        spender: paymentRouterAddress as Address,
        value: BigInt(amount),
        nonce: currentNonce,
        deadline: BigInt(deadline),
      };

      const signature = await signTypedDataAsync({
        domain: permitDomain,
        types: permitTypes,
        primaryType: "Permit",
        message: permitMessage,
      });

      addLog("success", "Signature obtained");

      // Parse signature
      const r = signature.slice(0, 66);
      const s = "0x" + signature.slice(66, 130);
      const v = parseInt(signature.slice(130, 132), 16);

      // Prepare permit data
      const permitData = {
        token: networkConfig.usdc,
        owner: address,
        value: amount,
        deadline,
        v,
        r,
        s,
      };

      const destinationConfig = CHAIN_CONFIGS[destinationNetwork];
      const isCrossChain = selectedNetwork !== destinationNetwork;

      if (isCrossChain) {
        addLog("info", `Cross-chain payment: ${CHAIN_CONFIGS[selectedNetwork].name} → ${destinationConfig.name}`);
      }

      addLog("pending", "Verifying payment with facilitator...");

      const response = await fetch(`${BACKEND_URL}/api/ai/location-suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-payment-permit": JSON.stringify(permitData),
          "x-payment-route": JSON.stringify({
            paymentId,
            sourceNetwork: selectedNetwork,
            sourceChainId: networkConfig.chainId,
            destinationNetwork: destinationNetwork,
            destinationChainId: destinationConfig.chainId,
            tokenIn: networkConfig.usdc,
            tokenOut: networkConfig.usdc, // Same token on source chain (no swap)
            amountIn: amount,
            minAmountOut: amount, // Same amount (no swap)
            merchant: RELAYER_ADDRESS,
            dexRouter: "0x0000000000000000000000000000000000000000", // No swap
            dexCalldata: "0x", // No swap
            bridgeRequired: isCrossChain,
            bridgeType: isCrossChain ? "mayan" : null,
          }),
        },
        body: JSON.stringify({ query, location }),
      });

      // Check for X-PAYMENT-RESPONSE header
      const paymentResponse = response.headers.get("X-PAYMENT-RESPONSE");
      if (paymentResponse) {
        try {
          const decoded = JSON.parse(atob(paymentResponse));
          addLog("success", `Payment settled! TX: ${decoded.txHash?.slice(0, 18)}...`);
          setIsPaid(true);
        } catch (e) {
          console.error("Failed to parse payment response:", e);
        }
      }

      if (response.status === 402) {
        try {
          const data = await response.json();
          addLog("error", `Payment required: ${data.reason || data.message}`);
          throw new Error(data.reason || "Payment required");
        } catch (e) {
          addLog("error", "Payment required but response format invalid");
          throw new Error("Payment required");
        }
      }

      if (!response.ok) {
        try {
          const data = await response.json();
          throw new Error(data.error || "Failed to get suggestions");
        } catch (e) {
          addLog("error", "Server error - please try again");
          throw new Error("Server error - please try again");
        }
      }

      try {
        const data = await response.json();
        addLog("success", "Suggestions generated successfully!");
        setResult(data);
      } catch (e) {
        addLog("error", "Failed to parse server response");
        throw new Error("Failed to parse server response");
      }
    } catch (err: any) {
      // Filter out the ugly JSON parsing error messages
      const errorMessage = err.message.includes("Unexpected token")
        ? "Processing payment - please wait a moment and try again"
        : err.message || "An error occurred";

      addLog("error", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <Header />

      <div className="max-w-6xl mx-auto p-8 pt-24">
        <div className="mb-8">
          <Link
            href="/ai"
            className="text-green-600 hover:text-green-800 dark:text-green-400 flex items-center gap-2"
          >
            ← Back to AI Services
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Main Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📍</div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Location Suggestions
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Premium Service • 0.5 USDC per request
              </p>
            </div>

            {/* Network Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Payment Network
              </label>
              <select
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                {Object.entries(CHAIN_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>{config.name}</option>
                ))}
              </select>
            </div>

            {/* Destination Network Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Settle On (Destination Chain)
              </label>
              <select
                value={destinationNetwork}
                onChange={(e) => setDestinationNetwork(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                {Object.entries(CHAIN_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>{config.name}</option>
                ))}
              </select>
              {selectedNetwork !== destinationNetwork && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  ✨ Cross-chain payment enabled - will be bridged via Mayan Protocol
                </p>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="E.g., New York, Paris, Tokyo"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What are you looking for?
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="E.g., Best coffee shops with outdoor seating"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white resize-none"
                  rows={4}
                />
              </div>

              <button
                onClick={handlePayAndGenerate}
                disabled={loading || !isConnected}
                className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : !isConnected ? (
                  "Connect Wallet to Continue"
                ) : (
                  "Pay 0.5 USDC & Get Suggestions"
                )}
              </button>

              {!isConnected && (
                <p className="text-center text-sm text-gray-500">
                  Connect your wallet using the button in the header
                </p>
              )}

              {error && (
                <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 rounded-lg">
                  <p className="text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {result && (
                <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Suggested Places
                  </h3>
                  {result.suggestions && Array.isArray(result.suggestions) ? (
                    <div className="space-y-4">
                      {result.suggestions.map((place: any, index: number) => (
                        <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                          <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                            {place.name || `Place ${index + 1}`}
                          </h4>
                          {place.description && (
                            <p className="text-gray-600 dark:text-gray-300 mb-2">{place.description}</p>
                          )}
                          {place.rating && (
                            <p className="text-sm text-yellow-600">⭐ {place.rating}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="bg-white dark:bg-gray-800 p-4 rounded overflow-auto whitespace-pre-wrap text-sm">
                      {typeof result.response === 'string' ? result.response : JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Logs Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              X402 Payment Logs
            </h2>

            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <p className="text-gray-500">Waiting for payment flow...</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 ${log.type === "success" ? "text-green-400" :
                        log.type === "error" ? "text-red-400" :
                          log.type === "pending" ? "text-yellow-400" : "text-gray-300"
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

            {paymentRequired && (
              <div className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
                  💰 Payment Required
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This is a premium API. Cost: 0.5 USDC
                </p>
              </div>
            )}

            {isPaid && (
              <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <h3 className="font-semibold text-green-800 dark:text-green-400">
                  ✅ Payment Complete
                </h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
