"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import { useAccount, useChainId, useSwitchChain, useSignTypedData } from "wagmi";
import { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia } from "viem/chains";
import { parseUnits, type Address } from "viem";

const FACILITATOR_URL = process.env.NEXT_PUBLIC_FACILITATOR_URL || "http://localhost:3000";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const RELAYER_ADDRESS = "0x95Cf028D5e86863570E300CAD14484Dc2068eB79" as Address;

// Chain configurations with deployed PaymentRouter and token addresses
const CHAIN_CONFIGS: Record<string, {
  chainId: number;
  name: string;
  chain: any;
  paymentRouter: Address;
  usdc: Address;
  dai?: Address;
  dexRouter?: Address;
}> = {
  "base-sepolia": {
    chainId: 84532,
    name: "Base Sepolia",
    chain: baseSepolia,
    paymentRouter: "0xC858560Ac08048258e57a1c6C47dAf682fC25F62" as Address,
    usdc: "0x2b23c6e36b46cC013158Bc2869D686023FA85422" as Address,
    dai: "0x6eb198E04d9a6844F74FC099d35b292127656A3F" as Address,
    dexRouter: "0x3351F07aF05108C102b3a8a24b61B26737c14D4a" as Address
  },
  "sepolia": {
    chainId: 11155111,
    name: "Sepolia",
    chain: sepolia,
    paymentRouter: "0x0E8b303b5245f7ba924Aadf5828226c7d35e3e13" as Address,
    usdc: "0xc505D038fe2901fe624E6450887373BaA29e455F" as Address
  },
  "arbitrum-sepolia": {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    paymentRouter: "0x404A674a52f85789a71D530af705f2f458bc5284" as Address,
    usdc: "0x7b926C6038a23c3E26F7f36DcBec7606BAF44434" as Address
  },
  "optimism-sepolia": {
    chainId: 11155420,
    name: "Optimism Sepolia",
    chain: optimismSepolia,
    paymentRouter: "0xC49568398F909aF8D40Cf27B26780e1B5Ca5996F" as Address,
    usdc: "0x281Ae468d00040BCbB4685972F51f87d473420F7" as Address
  },
};

type LogEntry = { timestamp: Date; type: "info" | "success" | "error" | "pending"; message: string };

export default function ImageGenerationPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();

  const [query, setQuery] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("base-sepolia");
  const [destinationNetwork, setDestinationNetwork] = useState<string>("base-sepolia");
  const [selectedToken, setSelectedToken] = useState<"USDC" | "DAI">("USDC");
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
      const response = await fetch(`${BACKEND_URL}/api/ai/image-generation`, {
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
      setError("Please enter a description");
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
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const paymentRouterAddress = networkConfig.paymentRouter; // Spender in permit

      // Determine input token
      const tokenIn = selectedToken === "DAI" && networkConfig.dai
        ? networkConfig.dai
        : networkConfig.usdc;

      // For demo, we assume 1:1 swap rate for simplicity, or we could fetch quote
      // If paying with DAI, we still pay 1 unit (1e18 for DAI vs 1e6 for USDC)
      const amount = selectedToken === "DAI"
        ? parseUnits("1", 18).toString() // 1 DAI
        : "1000000"; // 1 USDC

      addLog("info", `Starting X402 Payment Flow`);
      addLog("info", `Network: ${networkConfig.name}`);
      addLog("info", `Pay with: ${selectedToken}`);
      addLog("info", `Amount: ${selectedToken === "DAI" ? "1 DAI" : "1 USDC"}`);
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
      addLog("pending", `Fetching ${selectedToken} permit nonce...`);

      const { createPublicClient, http } = await import('viem');
      const publicClient = createPublicClient({
        chain: networkConfig.chain,
        transport: http(),
      });

      const currentNonce = await publicClient.readContract({
        address: tokenIn,
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
        name: selectedToken === "DAI" ? "Mock DAI" : "Mock USDC",
        version: "1",
        chainId: BigInt(networkConfig.chainId),
        verifyingContract: tokenIn,
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

      const permitData = {
        token: tokenIn,
        owner: address,
        value: amount,
        deadline,
        v,
        r,
        s,
      };

      // Send to backend
      addLog("pending", "Verifying payment with facilitator...");

      const destinationConfig = CHAIN_CONFIGS[destinationNetwork];
      const isCrossChain = selectedNetwork !== destinationNetwork;

      if (isCrossChain) {
        addLog("info", `Cross-chain payment: ${CHAIN_CONFIGS[selectedNetwork].name} → ${destinationConfig.name}`);
      }

      const response = await fetch(`${BACKEND_URL}/api/ai/image-generation`, {
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
            tokenIn, // Send selected token (what user pays with)
            tokenOut: tokenIn, // Settlement happens in same token on source chain
            amountIn: amount,
            minAmountOut: amount, // Same amount (no swap needed on source)
            merchant: RELAYER_ADDRESS, // Payment recipient on source chain
            dexRouter: "0x0000000000000000000000000000000000000000", // No swap needed
            dexCalldata: "0x", // No swap needed
            bridgeRequired: isCrossChain,
            bridgeType: isCrossChain ? "mayan" : null,
          }),
        },
        body: JSON.stringify({ query }),
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
          throw new Error(data.error || "Failed to generate");
        } catch (e) {
          // If JSON parsing fails, the backend might be returning HTML
          addLog("error", "Server error - please try again");
          throw new Error("Server error - please try again");
        }
      }

      try {
        const data = await response.json();
        addLog("success", "Image generated successfully!");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
      <Header />

      <div className="max-w-6xl mx-auto p-8 pt-24">
        <div className="mb-8">
          <Link
            href="/ai"
            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-2"
          >
            ← Back to AI Services
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Main Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎨</div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                AI Image Generation
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Premium Service • 1 USDC per request
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
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
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pay with
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedToken("USDC")}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${selectedToken === "USDC"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-400 dark:text-indigo-300"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    }`}
                >
                  <span className="font-bold">USDC</span>
                </button>
                <button
                  onClick={() => setSelectedToken("DAI")}
                  disabled={!CHAIN_CONFIGS[selectedNetwork].dai}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${selectedToken === "DAI"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-400 dark:text-indigo-300"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    } ${!CHAIN_CONFIGS[selectedNetwork].dai ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className="font-bold">DAI</span>
                  {CHAIN_CONFIGS[selectedNetwork].dai && <span className="text-xs ml-2 bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Swap</span>}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Describe the image you want to create
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="E.g., A serene mountain landscape at sunset with a crystal clear lake"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none"
                  rows={4}
                />
              </div>

              <button
                onClick={handlePayAndGenerate}
                disabled={loading || !isConnected}
                className="w-full px-6 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
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
                  "Pay 1 USDC & Generate"
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
                    Generated Result
                  </h3>

                  {/* Display Generated Image */}
                  <div className="mb-6 rounded-lg overflow-hidden shadow-lg">
                    <img
                      src={`https://image.pollinations.ai/prompt/${encodeURIComponent(result.imageDescription || result.response || query)}`}
                      alt="Generated AI Image"
                      className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>

                  <div className="text-gray-600 dark:text-gray-300">
                    <h4 className="font-medium mb-2">Image Description:</h4>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-sm italic">
                      {result.response || result.imageDescription || JSON.stringify(result, null, 2)}
                    </div>
                  </div>
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

            {/* Payment Info */}
            {paymentRequired && (
              <div className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
                  💰 Payment Required
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This is a premium API. Cost: 1 USDC
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
