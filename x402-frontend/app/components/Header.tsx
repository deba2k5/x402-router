"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Header({ darkMode = false }: { darkMode?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const textColor = scrolled ? 'text-gray-100' : (darkMode ? 'text-white' : 'text-gray-100');
  const navColor = scrolled ? 'text-gray-700 hover:text-gray-100' : (darkMode ? 'text-gray-200 hover:text-black' : 'text-gray-300 hover:text-black');

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? 'bg-transparent backdrop-blur-lg shadow-sm '
        : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              {/* Logo icon */}
              <div className="relative bg-indigo-600 p-2.5 rounded-xl group-hover:bg-indigo-700 group-hover:scale-110 transition-all shadow-lg">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 4L4 10L16 16L28 10L16 4Z" fill="white" />
                  <path d="M4 16L16 22L28 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M4 22L16 28L28 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col">
              <span className={`text-2xl font-black tracking-tight ${textColor}`}>
                X402
              </span>
              <span className={`text-[10px] tracking-widest font-semibold ${scrolled ? 'text-gray-600' : (darkMode ? 'text-gray-400' : 'text-gray-600')}`}>
                PROTOCOL
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/ai"
              className={`relative px-6 py-2 transition-all duration-300 font-semibold text-sm group ${navColor}`}
            >
              <span className="relative z-10">AI Services</span>
              <div className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-100 rounded-lg transition-all duration-300"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-indigo-600 group-hover:w-3/4 transition-all duration-300"></div>
            </Link>
            <Link
              href="/payment"
              className={`relative px-6 py-2 transition-all duration-300 font-semibold text-sm group ${navColor}`}
            >
              <span className="relative z-10">Payment</span>
              <div className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-100 rounded-lg transition-all duration-300"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-indigo-600 group-hover:w-3/4 transition-all duration-300"></div>
            </Link>
          </nav>

          {/* Connect Button */}
          <div className="relative">
            <div className="relative bg-white border border-gray-300 rounded-lg p-1 hover:border-indigo-600 hover:shadow-md transition-all">
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                accountStatus={{
                  smallScreen: "avatar",
                  largeScreen: "full",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
