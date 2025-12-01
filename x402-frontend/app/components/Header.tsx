"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? 'bg-black'
        : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-2 bg-white/20 rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity"></div>

              {/* Logo icon */}
              <div className="relative bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/20 group-hover:scale-110 transition-transform">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 4L4 10L16 16L28 10L16 4Z" fill="white" />
                  <path d="M4 16L16 22L28 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M4 22L16 28L28 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-2xl font-black text-white tracking-tight">
                X402
              </span>
              <span className="text-[10px] text-white/70 tracking-widest font-semibold">
                PROTOCOL
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/ai"
              className="relative px-6 py-2 text-white/90 hover:text-white transition-all duration-300 font-semibold text-sm group"
            >
              <span className="relative z-10">AI Services</span>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-lg transition-all duration-300"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-white group-hover:w-3/4 transition-all duration-300"></div>
            </Link>
            <Link
              href="/payment"
              className="relative px-6 py-2 text-white/90 hover:text-white transition-all duration-300 font-semibold text-sm group"
            >
              <span className="relative z-10">Payment</span>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-lg transition-all duration-300"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-white group-hover:w-3/4 transition-all duration-300"></div>
            </Link>
          </nav>

          {/* Connect Button */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>

            <div className="relative bg-white/10 backdrop-blur-md rounded-lg p-1 border border-white/20 hover:border-white/40 transition-all">
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

      {/* Subtle bottom glow */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
    </header>
  );
}
