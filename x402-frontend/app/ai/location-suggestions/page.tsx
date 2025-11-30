"use client";

import { useState } from "react";
import Link from "next/link";

export default function LocationSuggestionsPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!query.trim()) {
      setError("Please enter your preferences");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("http://localhost:3001/api/ai/location-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, location }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get suggestions");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/ai"
            className="text-green-600 hover:text-green-800 dark:text-green-400 flex items-center gap-2"
          >
            ← Back to AI Services
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📍</div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Location-Based Suggestions
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Powered by GROQ Llama 3.3 70B via X402 Protocol
            </p>
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
                placeholder="E.g., Best coffee shops with outdoor seating, family-friendly restaurants, quiet places to work"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white resize-none"
                rows={4}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Finding Places...
                </span>
              ) : (
                "Get Suggestions"
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-lg">
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
                          <p className="text-gray-600 dark:text-gray-300 mb-2">
                            {place.description}
                          </p>
                        )}
                        {place.address && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            📍 {place.address}
                          </p>
                        )}
                        {place.rating && (
                          <p className="text-sm text-yellow-600 dark:text-yellow-400">
                            ⭐ {place.rating}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-600 dark:text-gray-300">
                    <p className="mb-2"><strong>Response:</strong></p>
                    <pre className="bg-white dark:bg-gray-800 p-4 rounded overflow-auto whitespace-pre-wrap">
                      {typeof result.response === 'string' ? result.response : JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
