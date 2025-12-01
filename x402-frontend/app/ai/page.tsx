"use client";

import Link from "next/link";
import Header from "../components/Header";
import GlareHover from "../components/GlareHover";

export default function AIPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600 mb-12 transition-colors group font-medium"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          {/* Header */}
          <div className="text-center max-w-4xl mx-auto mb-20">

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Choose Your
              <br />
              <span className="text-indigo-600">AI Experience</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Select from our suite of AI-powered services. Pay securely with cryptocurrency across multiple blockchains.
            </p>
          </div>

          {/* Service Cards Grid */}
          <div className="grid lg:grid-cols-2 gap-8 mb-20">
            {/* AI Image Generation Card */}
            <Link href="/ai/image-generation" className="group block h-full">
              <GlareHover
                glareColor="#6366f1"
                glareOpacity={0.3}
                glareAngle={-30}
                glareSize={300}
                transitionDuration={800}
                playOnce={false}
                borderRadius="1.5rem"
                height="100%"
              >
                <div className="relative bg-white rounded-3xl border-2 border-gray-200 p-10 h-full">
                  {/* Top Section */}
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex-1">
                      <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-300">
                        <svg className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>

                      <h2 className="text-3xl font-bold text-gray-900 mb-3">
                        AI Image Generation
                      </h2>
                      <p className="text-gray-600 text-lg leading-relaxed mb-6">
                        Transform text into stunning visuals using advanced GROQ Llama 3.3 70B AI technology.
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {[
                      'Text-to-Image generation',
                      'Powered by GROQ Llama AI',
                      'Multi-chain payment support',
                      'Instant delivery'
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-700 font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Section */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <div>
                      <div className="text-3xl font-black text-gray-900">1 USDC</div>
                      <div className="text-sm text-gray-500 font-medium">per generation</div>
                    </div>
                    <div className="relative">
                      {/* Animated gradient border */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl opacity-75 blur group-hover:opacity-100 animate-pulse"></div>
                      <div className="relative bg-white px-6 py-3 rounded-xl border-2 border-transparent bg-clip-padding">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                        <div className="flex items-center gap-2 text-indigo-600 group-hover:text-white font-bold text-lg group-hover:gap-4 transition-all relative z-10">
                          <span>Generate</span>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover Indicator */}
                  <div className="absolute top-4 right-4 w-3 h-3 bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </GlareHover>
            </Link>

            {/* Location Intelligence Card */}
            <Link href="/ai/location-suggestions" className="group block h-full">
              <GlareHover
                glareColor="#10b981"
                glareOpacity={0.3}
                glareAngle={-30}
                glareSize={300}
                transitionDuration={800}
                playOnce={false}
                borderRadius="1.5rem"
                height="100%"
              >
                <div className="relative bg-white rounded-3xl border-2 border-gray-200 p-10 h-full">
                  {/* Top Section */}
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex-1">
                      <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-600 transition-all duration-300">
                        <svg className="w-10 h-10 text-emerald-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>

                      <h2 className="text-3xl font-bold text-gray-900 mb-3">
                        Location Intelligence
                      </h2>
                      <p className="text-gray-600 text-lg leading-relaxed mb-6">
                        Discover amazing places with AI-powered personalized recommendations.
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {[
                      'Personalized recommendations',
                      'Powered by GROQ AI',
                      'Multi-chain payment support',
                      'Real-time results'
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-700 font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Section */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <div>
                      <div className="text-3xl font-black text-gray-900">1 USDC</div>
                      <div className="text-sm text-gray-500 font-medium">per request</div>
                    </div>
                    <div className="relative">
                      {/* Animated gradient border */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-xl opacity-75 blur group-hover:opacity-100 animate-pulse"></div>
                      <div className="relative bg-white px-6 py-3 rounded-xl border-2 border-transparent bg-clip-padding">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                        <div className="flex items-center gap-2 text-emerald-600 group-hover:text-white font-bold text-lg group-hover:gap-4 transition-all relative z-10">
                          <span>Discover</span>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover Indicator */}
                  <div className="absolute top-4 right-4 w-3 h-3 bg-emerald-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </GlareHover>
            </Link>
          </div>

          {/* Info Section */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Powered by X402 Multi-Chain Protocol
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    All services use <span className="font-semibold text-gray-900">GROQ Llama 3.3 AI</span> and are secured by our multi-chain payment infrastructure. Pay with any token on any supported chain: <span className="font-semibold text-gray-900">Base, Sepolia, Arbitrum, or Optimism</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
