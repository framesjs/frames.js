"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { WagmiProvider } from "wagmi";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  zora,
  anvil,
} from "wagmi/chains";

const config = getDefaultConfig({
  appName: "frames.js debugger",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID!,
  chains: [mainnet, polygon, optimism, arbitrum, base, zora, anvil],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
