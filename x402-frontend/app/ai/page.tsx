"use client";

import Link from "next/link";

export default function AIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
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
            Choose Your AI Experience
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Select the AI service you want to use
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* AI Image Generation Card */}
          <Link href="/ai/image-generation">
            <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:scale-105 cursor-pointer border-2 border-transparent hover:border-indigo-500">
              <div className="text-6xl mb-6 text-center">🎨</div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                AI Image Generation
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
                Create stunning images from text descriptions using GROQ Llama 3.3 70B AI
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Text-to-Image generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Powered by GROQ Llama</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>X404 Protocol enabled</span>
                </div>
              </div>
              <div className="mt-8 text-center">
                <span className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-full font-semibold group-hover:bg-indigo-700">
                  Generate Images →
                </span>
              </div>
            </div>
          </Link>

          {/* Location-Based Suggestions Card */}
          <Link href="/ai/location-suggestions">
            <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all transform hover:scale-105 cursor-pointer border-2 border-transparent hover:border-green-500">
              <div className="text-6xl mb-6 text-center">📍</div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                Location Suggestions
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
                Discover amazing places based on your preferences with GROQ Llama 3.3 AI
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Personalized recommendations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Powered by GROQ AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>X402 Protocol enabled</span>
                </div>
              </div>
              <div className="mt-8 text-center">
                <span className="inline-block px-6 py-3 bg-green-600 text-white rounded-full font-semibold group-hover:bg-green-700">
                  Find Places →
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
