"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  zora,
  anvil,
  baseSepolia,
  optimismSepolia,
  arbitrumSepolia,
  zoraSepolia,
  sepolia,
  scrollSepolia,
  liskSepolia,
} from "wagmi/chains";

const config = getDefaultConfig({
  appName: "frames.js docs examples renderer",
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- this is set
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID!,
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    zora,
    anvil,
    // sepolia testnets
    baseSepolia,
    optimismSepolia,
    arbitrumSepolia,
    zoraSepolia,
    sepolia,
    scrollSepolia,
    liskSepolia,
  ],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
