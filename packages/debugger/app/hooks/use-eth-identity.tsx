"use client";

import type { SignerStateInstance } from "@frames.js/render";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useEffect, useMemo, useState } from "react";
import { createWalletClient, http, zeroAddress } from "viem";
import {
  useAccount,
  useConfig,
  useSignTypedData,
  useWalletClient,
} from "wagmi";
import { getAccount, signMessage } from "wagmi/actions";
import { ETH_APP_METADATA, LOCAL_STORAGE_KEYS } from "../constants";
import type { EthFrameContext } from "./use-eth-context";
import {
  SignedPublicKeyBundle,
  createEthereumFrameRequest,
  signPublicKeyBundle,
  type EthereumFrameRequest,
  type PublicKeyBundle,
} from "frames.js/ethereum";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

type EthSigner = {
  signedPublicKeyBundle: SignedPublicKeyBundle;
  privateKey: `0x${string}`;
};

type EthSignerInstance = SignerStateInstance<
  EthSigner,
  EthereumFrameRequest,
  EthFrameContext
>;

export function useEthIdentity(): EthSignerInstance {
  const [isLoading, setLoading] = useState(false);
  const [ethSigner, setEthSigner] = useState<EthSigner | null>(null);
  const config = useConfig();
  const connect = useConnectModal();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  function getSignerFromLocalStorage(): EthSigner | null {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem(
        LOCAL_STORAGE_KEYS.ETHEREUM_SIGNER
      );
      if (storedData) {
        const signer = JSON.parse(storedData) as EthSigner;
        return signer;
      }
      return null;
    }

    return null;
  }

  useEffect(() => {
    const signer = getSignerFromLocalStorage();
    if (signer) setEthSigner(signer);
  }, []);

  function logout(): void {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ETHEREUM_SIGNER);
    setEthSigner(null);
  }

  async function onSignerlessFramePress(): Promise<void> {
    setLoading(true);
    await createAndStoreSigner();
    setLoading(false);
  }

  async function createAndStoreSigner(): Promise<void> {
    try {
      if (!ethSigner) {
        if (!walletClient?.account) {
          connect.openConnectModal?.();
          return;
        }

        const privateKey = generatePrivateKey();
        const account = privateKeyToAccount(privateKey);

        const publicKeyBundle: PublicKeyBundle = {
          timestamp: Date.now(),
          proxy_key_bytes: account.address,
          app_data_type: "1",
          app_data: JSON.stringify(ETH_APP_METADATA),
        };

        const walletSignature = await signPublicKeyBundle(
          publicKeyBundle,
          // @ts-expect-error -- wallet has weird type issue
          walletClient
        );

        const authorizationResponse = await fetch(
          // real signer or local one are handled by local route so we don't need to expose anything to client side bundle
          "/signer/ethereum",
          {
            method: "POST",
            body: JSON.stringify({
              publicKeyBundle,
              walletSignature,
              walletAddress: address,
            }),
          }
        );

        if (!authorizationResponse.ok) {
          console.error(
            "frames.js: ethereum: Authorization failed",
            await authorizationResponse.text()
          );
          return;
        }

        const { signedPublicKeyBundle } =
          (await authorizationResponse.json()) as {
            signedPublicKeyBundle: SignedPublicKeyBundle;
          };

        const signer = { signedPublicKeyBundle, privateKey };

        localStorage.setItem(
          LOCAL_STORAGE_KEYS.ETHEREUM_SIGNER,
          JSON.stringify({ signedPublicKeyBundle, privateKey })
        );
        setEthSigner(signer);
      }
    } catch (error) {
      console.error("frames.js: API Call failed", error);
    }
  }

  return {
    signer: ethSigner,
    hasSigner: !!ethSigner?.privateKey,
    async signFrameAction(actionContext) {
      if (!ethSigner?.signedPublicKeyBundle) {
        throw new Error("No signedPublicKeyBundle");
      }

      if (!address) {
        throw new Error("No address");
      }

      const signerWalletClient = createWalletClient({
        account: privateKeyToAccount(ethSigner.privateKey),
        chain: mainnet,
        transport: http(),
      });

      const payload = await createEthereumFrameRequest(
        {
          url: actionContext.url,
          unixTimestamp: Date.now(),
          inputText: actionContext.inputText,
          state: actionContext.state,
          buttonIndex: actionContext.buttonIndex,
          transactionId: actionContext.transactionId,
          address: actionContext.address,
          // transactionId: actionContext.transactionId, // TODO: enable when included upstream
        },
        // @ts-expect-error -- wallet has weird type issue
        signerWalletClient,
        ethSigner.signedPublicKeyBundle
      );

      const searchParams = new URLSearchParams({
        postType: actionContext.transactionId
          ? "post"
          : actionContext.frameButton.action,
        postUrl: actionContext.frameButton.target ?? "",
        specification: "openframes",
      });

      return {
        body: payload,
        searchParams,
      };
    },
    isLoading: null,
    isLoadingSigner: isLoading,
    onSignerlessFramePress,
    logout,
  };
}
