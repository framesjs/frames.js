"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import {
  WagmiProvider,
  cookieStorage,
  cookieToInitialState,
  createStorage,
} from "wagmi";
import {
  anvil,
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  zora,
} from "wagmi/chains";

// const customRef = process.env.NEXT_PUBLIC_CUSTOM_CHAIN_ID
//   ? (Object.values(chains).find(
//       (chain) => chain.id === parseInt(process.env.NEXT_PUBLIC_CUSTOM_CHAIN_ID!)
//     ) as any)
//   : undefined;
// const custom =
//   process.env.NEXT_PUBLIC_CUSTOM_CHAIN_ID &&
//   process.env.NEXT_PUBLIC_CUSTOM_CHAIN_RPC
//     ? defineChain({
//         id: parseInt(process.env.NEXT_PUBLIC_CUSTOM_CHAIN_ID),
//         name: "Custom Chain",
//         nativeCurrency: {
//           decimals: 18,
//           name: "ETH",
//           symbol: "ETH",
//         },
//         ...customRef,
//         rpcUrls: {
//           default: {
//             http: [process.env.NEXT_PUBLIC_CUSTOM_CHAIN_RPC],
//           },
//         },
//       })
//     : undefined;

let supportedChains = [mainnet, polygon, optimism, arbitrum, base, zora, anvil];

// if (custom) {
//   supportedChains = supportedChains.filter(
//     (c) =>
//       process.env.NEXT_PUBLIC_CUSTOM_CHAIN_ID &&
//       c.id !== parseInt(process.env.NEXT_PUBLIC_CUSTOM_CHAIN_ID)
//   );
//   supportedChains.push(custom as any);
// }

export const config = getDefaultConfig({
  appName: "frames.js debugger",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID!,
  chains: supportedChains as any,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

const queryClient = new QueryClient();

export function Providers({
  children,
  cookie,
}: {
  cookie: string;
  children: React.ReactNode;
}) {
  const initialState = cookieToInitialState(config, cookie);

  return (
    <WagmiProvider config={config} {...(initialState ? { initialState } : {})}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
