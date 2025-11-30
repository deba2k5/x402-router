"use client";

import { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia } from "viem/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

// RainbowKit config with supported chains from README
const config = getDefaultConfig({
  appName: "X402 Router",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "demo-project-id",
  chains: [baseSepolia, sepolia, arbitrumSepolia, optimismSepolia],
  transports: {
    [baseSepolia.id]: http("https://sepolia.base.org"),
    [sepolia.id]: http("https://rpc.sepolia.org"),
    [arbitrumSepolia.id]: http("https://sepolia-rollup.arbitrum.io/rpc"),
    [optimismSepolia.id]: http("https://sepolia.optimism.io"),
  },
});

const queryClient = new QueryClient();

const theme = darkTheme({
  accentColor: "#7b3fe4",
  accentColorForeground: "white",
  fontStack: "system",
  overlayBlur: "small",
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
