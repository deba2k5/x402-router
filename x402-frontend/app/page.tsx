"use client";

import Link from "next/link";
import Header from "./components/Header";
import { GridScan } from './components/GridScan';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden text-white">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <GridScan
          sensitivity={0.55}
          lineThickness={1}
          linesColor="#392e4e"
          gridScale={0.1}
          scanColor="#FF9FFC"
          scanOpacity={0.4}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0.002}
          noiseIntensity={0.01}
        />
      </div>
      <div className="relative z-10">
        <Header darkMode={true} />

        <main className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-200px)]">
              {/* Left Column - Text Content */}
              <div className="space-y-8">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight">
                  Multi-chain{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">x402 Payment</span>{" "}
                  Protocol
                </h1>

                <p className="text-lg sm:text-xl text-gray-400 max-w-2xl leading-relaxed">
                  Pay with any token on any chain. Unlock instant access to premium API resources with real-time settlement powered by cutting-edge blockchain technology.
                </p>

                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <div className="p-4 bg-white/5 backdrop-blur-sm rounded-lg shadow-sm border border-white/10">
                    <div className="text-3xl font-black text-indigo-400">4+</div>
                    <div className="text-sm text-gray-400">Chains</div>
                  </div>
                  <div className="p-4 bg-white/5 backdrop-blur-sm rounded-lg shadow-sm border border-white/10">
                    <div className="text-3xl font-black text-emerald-400">∞</div>
                    <div className="text-sm text-gray-400">Transactions</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                  <Link
                    href="/ai"
                    className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-indigo-500/25"
                  >
                    Try AI Services
                  </Link>
                  <Link
                    href="/payment"
                    className="px-8 py-4 bg-white/5 backdrop-blur-sm text-white font-semibold rounded-lg border-2 border-white/10 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
                  >
                    Payment
                  </Link>
                </div>
              </div>

              {/* Right Column - Network Visualization */}
              <div className="relative flex items-center justify-center">
                <div className="relative w-full max-w-md aspect-square">
                  {/* Central Hub */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.5)] z-10">
                    <div className="text-center">
                      <div className="text-2xl font-black text-white">X402</div>
                      <div className="text-xs text-white/80">Router</div>
                    </div>
                  </div>

                  {/* Chain Nodes */}
                  {[
                    { name: 'Base', color: 'bg-blue-600', position: 'top-0 left-1/2 -translate-x-1/2' },
                    { name: 'Sepolia', color: 'bg-purple-600', position: 'right-0 top-1/2 -translate-y-1/2' },
                    { name: 'Arbitrum', color: 'bg-cyan-600', position: 'bottom-0 left-1/2 -translate-x-1/2' },
                    { name: 'Optimism', color: 'bg-red-600', position: 'left-0 top-1/2 -translate-y-1/2' },
                  ].map((chain, index) => (
                    <div
                      key={chain.name}
                      className={`absolute ${chain.position} w-24 h-24 ${chain.color} rounded-full flex items-center justify-center text-white font-bold shadow-lg animate-pulse border-2 border-white/10`}
                      style={{ animationDelay: `${index * 0.2}s`, animationDuration: '3s' }}
                    >
                      <div className="text-center text-sm">
                        {chain.name}
                      </div>
                    </div>
                  ))}

                  {/* Connection Lines */}
                  <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                    <line x1="50%" y1="16%" x2="50%" y2="50%" stroke="#4F46E5" strokeWidth="2" strokeDasharray="5,5" className="opacity-50" />
                    <line x1="84%" y1="50%" x2="50%" y2="50%" stroke="#4F46E5" strokeWidth="2" strokeDasharray="5,5" className="opacity-50" />
                    <line x1="50%" y1="84%" x2="50%" y2="50%" stroke="#4F46E5" strokeWidth="2" strokeDasharray="5,5" className="opacity-50" />
                    <line x1="16%" y1="50%" x2="50%" y2="50%" stroke="#4F46E5" strokeWidth="2" strokeDasharray="5,5" className="opacity-50" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Features Section */}
        <section className="py-20 bg-black/20 backdrop-blur-sm border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-400">
                Seamless cross-chain payments in three simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg shadow-indigo-500/20">
                  1
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Choose Your Chain
                </h3>
                <p className="text-gray-400">
                  Select from Base, Sepolia, Arbitrum, or Optimism. Pay with USDC or DAI.
                </p>
              </div>

              <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg shadow-purple-500/20">
                  2
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Sign Permit
                </h3>
                <p className="text-gray-400">
                  Gasless payment authorization with EIP-2612 permit signatures.
                </p>
              </div>

              <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                  3
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Instant Access
                </h3>
                <p className="text-gray-400">
                  Real-time settlement unlocks premium AI services immediately.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Networks */}
        <section className="py-20 bg-transparent border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
                Supported Networks
              </h2>
              <p className="text-xl text-gray-400">
                Trade seamlessly across multiple blockchains
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Base Sepolia', desc: 'Lightning-fast L2', gradient: 'bg-gradient-to-br from-blue-600 to-blue-700' },
                { name: 'Sepolia', desc: 'Ethereum testnet', gradient: 'bg-gradient-to-br from-purple-600 to-purple-700' },
                { name: 'Arbitrum Sepolia', desc: 'Optimistic rollup', gradient: 'bg-gradient-to-br from-cyan-600 to-cyan-700' },
                { name: 'Optimism Sepolia', desc: 'OP Stack L2', gradient: 'bg-gradient-to-br from-red-600 to-red-700' },
              ].map((network) => (
                <div
                  key={network.name}
                  className="bg-white/5 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-white/10 hover:border-indigo-500/50"
                >
                  <div className={`w-12 h-12 ${network.gradient} rounded-full mb-4 shadow-lg`}></div>
                  <h3 className="text-xl font-bold text-white mb-2">{network.name}</h3>
                  <p className="text-gray-400 text-sm">{network.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Premium Services */}
        <section className="py-20 bg-black/20 backdrop-blur-sm border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
                AI Services
              </h2>
              <p className="text-xl text-gray-400">
                Pay-as-you-go access powered by GROQ Llama 3.3
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:border-indigo-500/50 transition-colors group">
                <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">🎨</div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  AI Image Generation
                </h3>
                <p className="text-gray-400 mb-4">
                  Create stunning visuals with advanced AI technology
                </p>
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-indigo-400">Price:</span> 1 USDC per request
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:border-emerald-500/50 transition-colors group">
                <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">📍</div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Location Intelligence
                </h3>
                <p className="text-gray-400 mb-4">
                  Get personalized place recommendations powered by AI
                </p>
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-emerald-400">Price:</span> 1 USDC per request
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-t border-white/5">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">
              Ready to Experience X402?
            </h2>
            <p className="text-xl text-indigo-200 mb-8">
              Start using our premium AI services with seamless multi-chain payments
            </p>
            <Link
              href="/ai"
              className="inline-block px-12 py-5 bg-white text-indigo-900 font-bold text-lg rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl shadow-indigo-500/20"
            >
              Get Started Now →
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black text-gray-500 py-12 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-4">
              <span className="text-2xl font-black text-white">X402</span>
              <span className="text-indigo-500 ml-2">Protocol</span>
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
    </div>
  );
}
