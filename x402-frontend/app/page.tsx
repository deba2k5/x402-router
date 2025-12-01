"use client";

import Link from "next/link";
import Header from "./components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-200px)]">
            {/* Left Column - Text Content */}
            <div className="space-y-8">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-tight">
                Multi-chain{" "}
                <span className="text-indigo-600">x402 Payment</span>{" "}
                Protocol
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed">
                Pay with any token on any chain. Unlock instant access to premium API resources with real-time settlement powered by cutting-edge blockchain technology.
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="text-3xl font-black text-indigo-600">4+</div>
                  <div className="text-sm text-gray-600">Chains</div>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="text-3xl font-black text-green-600">∞</div>
                  <div className="text-sm text-gray-600">Transactions</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <Link
                  href="/ai"
                  className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Try AI Services
                </Link>
                <Link
                  href="/payment"
                  className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-lg border-2 border-gray-300 hover:border-indigo-600 hover:text-indigo-600 transition-colors"
                >
                  Payment
                </Link>
              </div>
            </div>

            {/* Right Column - Network Visualization */}
            <div className="relative flex items-center justify-center">
              <div className="relative w-full max-w-md aspect-square">
                {/* Central Hub */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl z-10">
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">X402</div>
                    <div className="text-xs text-white/80">Router</div>
                  </div>
                </div>

                {/* Chain Nodes */}
                {[
                  { name: 'Base', color: 'bg-blue-500', position: 'top-0 left-1/2 -translate-x-1/2' },
                  { name: 'Sepolia', color: 'bg-purple-500', position: 'right-0 top-1/2 -translate-y-1/2' },
                  { name: 'Arbitrum', color: 'bg-cyan-500', position: 'bottom-0 left-1/2 -translate-x-1/2' },
                  { name: 'Optimism', color: 'bg-red-500', position: 'left-0 top-1/2 -translate-y-1/2' },
                ].map((chain, index) => (
                  <div
                    key={chain.name}
                    className={`absolute ${chain.position} w-24 h-24 ${chain.color} rounded-full flex items-center justify-center text-white font-bold shadow-lg animate-pulse`}
                    style={{ animationDelay: `${index * 0.2}s`, animationDuration: '3s' }}
                  >
                    <div className="text-center text-sm">
                      {chain.name}
                    </div>
                  </div>
                ))}

                {/* Connection Lines */}
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                  <line x1="50%" y1="16%" x2="50%" y2="50%" stroke="#E0E7FF" strokeWidth="2" strokeDasharray="5,5" />
                  <line x1="84%" y1="50%" x2="50%" y2="50%" stroke="#E0E7FF" strokeWidth="2" strokeDasharray="5,5" />
                  <line x1="50%" y1="84%" x2="50%" y2="50%" stroke="#E0E7FF" strokeWidth="2" strokeDasharray="5,5" />
                  <line x1="16%" y1="50%" x2="50%" y2="50%" stroke="#E0E7FF" strokeWidth="2" strokeDasharray="5,5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Seamless cross-chain payments in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-indigo-200">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Choose Your Chain
              </h3>
              <p className="text-gray-600">
                Select from Base, Sepolia, Arbitrum, or Optimism. Pay with USDC or DAI.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-100 border border-purple-200">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Sign Permit
              </h3>
              <p className="text-gray-600">
                Gasless payment authorization with EIP-2612 permit signatures.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Instant Access
              </h3>
              <p className="text-gray-600">
                Real-time settlement unlocks premium AI services immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Networks */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
              Supported Networks
            </h2>
            <p className="text-xl text-gray-600">
              Trade seamlessly across multiple blockchains
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Base Sepolia', desc: 'Lightning-fast L2', color: 'blue' },
              { name: 'Sepolia', desc: 'Ethereum testnet', color: 'purple' },
              { name: 'Arbitrum Sepolia', desc: 'Optimistic rollup', color: 'cyan' },
              { name: 'Optimism Sepolia', desc: 'OP Stack L2', color: 'red' },
            ].map((network) => (
              <div
                key={network.name}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border-2 border-gray-100 hover:border-indigo-500"
              >
                <div className={`w-12 h-12 bg-gradient-to-br from-${network.color}-500 to-${network.color}-600 rounded-full mb-4`}></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{network.name}</h3>
                <p className="text-gray-600 text-sm">{network.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Services */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
              Premium AI Services
            </h2>
            <p className="text-xl text-gray-600">
              Pay-as-you-go access powered by GROQ Llama 3.3
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-100 rounded-2xl p-8 border-2 border-indigo-200">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                AI Image Generation
              </h3>
              <p className="text-gray-700 mb-4">
                Create stunning visuals with advanced AI technology
              </p>
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Price:</span> 1 USDC per request
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 border-2 border-green-200">
              <div className="text-6xl mb-4">📍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Location Intelligence
              </h3>
              <p className="text-gray-700 mb-4">
                Get personalized place recommendations powered by AI
              </p>
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Price:</span> 1 USDC per request
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">
            Ready to Experience X402?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Start using our premium AI services with seamless multi-chain payments
          </p>
          <Link
            href="/ai"
            className="inline-block px-12 py-5 bg-white text-indigo-600 font-bold text-lg rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl"
          >
            Get Started Now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-4">
            <span className="text-2xl font-black text-white">X402</span>
            <span className="text-indigo-400 ml-2">Protocol</span>
          </div>
          <p className="text-sm">
            Powered by GROQ Llama 3.3 AI • Multi-Chain Payment Router
          </p>
          <p className="text-xs mt-4">
            Base • Sepolia • Arbitrum • Optimism
          </p>
        </div>
      </footer>
    </div>
  );
}
