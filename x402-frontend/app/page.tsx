import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex flex-col items-center justify-center gap-8 p-8 text-center">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white">
            X402 Protocol
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
            Experience the power of AI with our cutting-edge X402 protocol.
            Generate stunning images and discover amazing places with intelligent suggestions.
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
            Powered by GROQ Llama 3.3 AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-4xl">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              AI Image Generation
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Transform your ideas into stunning visuals using Gemini Nano Banana AI
            </p>
          </div>
          
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Location-Based Suggestions
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get personalized place recommendations powered by Alith AI
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
