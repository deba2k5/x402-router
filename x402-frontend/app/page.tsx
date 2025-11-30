"use client";

import Link from "next/link";
import Header from "./components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="flex flex-col items-center justify-center min-h-screen gap-8 p-8 pt-24 text-center">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white">
            X402 Protocol
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
            Multi-chain payment router enabling pay-any-chain, pay-any-token settlement 
            with real-time access unlock for paid API resources.
          </p>
        </div>
        
        <div className="flex flex-col gap-4 mt-8">
          <Link
            href="/ai"
            className="px-12 py-4 text-lg font-semibold text-white bg-indigo-600 rounded-full shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105 hover:shadow-xl"
          >
            Let&apos;s Begin
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Powered by GROQ Llama 3.3 AI • Multi-Chain Support
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 max-w-6xl">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Base Sepolia
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Fast & low-cost L2 transactions
            </p>
          </div>
          
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-4xl mb-4">⟠</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Sepolia
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Ethereum testnet support
            </p>
          </div>
          
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🔵</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Arbitrum Sepolia
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Optimistic rollup scaling
            </p>
          </div>
          
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🔴</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Optimism Sepolia
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              OP Stack powered L2
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-4xl">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              AI Image Generation
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Transform your ideas into stunning visuals using GROQ Llama AI
            </p>
          </div>
          
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Location-Based Suggestions
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get personalized place recommendations powered by AI
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
