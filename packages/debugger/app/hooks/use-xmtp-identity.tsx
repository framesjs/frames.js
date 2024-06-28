"use client";

import type { SignerStateInstance } from "@frames.js/render";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { type FramePostPayload, FramesClient } from "@xmtp/frames-client";
import { Client, type Signer } from "@xmtp/xmtp-js";
import { useEffect, useMemo, useState } from "react";
import { zeroAddress } from "viem";
import { useAccount, useConfig } from "wagmi";
import { getAccount, signMessage } from "wagmi/actions";
import { LOCAL_STORAGE_KEYS } from "../constants";
import type { XmtpFrameContext } from "./use-xmtp-context";

type XmtpSigner = {
  walletAddress: string;
  keys: Uint8Array;
};

type XmtpStoredSigner = {
  walletAddress: string;
  keys: string;
};

type XmtpSignerInstance = SignerStateInstance<
  XmtpSigner,
  FramePostPayload,
  XmtpFrameContext
>;

export function useXmtpIdentity(): XmtpSignerInstance {
  const [isLoading, setLoading] = useState(false);
  const [xmtpSigner, setXmtpSigner] = useState<XmtpSigner | null>(null);
  const [xmtpClient, setXmtpClient] = useState<Client | null>(null);
  const config = useConfig();
  const connect = useConnectModal();
  const { address } = useAccount();

  const walletSigner: Signer | null = useMemo(
    () =>
      address
        ? {
            getAddress() {
              return Promise.resolve(address);
            },
            signMessage(message) {
              return signMessage(config, {
                message: {
                  raw:
                    typeof message === "string"
                      ? Buffer.from(message)
                      : Buffer.from(message as Uint8Array),
                },
              });
            },
          }
        : null,
    [address, config]
  );

  function getSignerFromLocalStorage(): XmtpSigner | null {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEYS.XMTP_SIGNER);
      if (storedData) {
        const signerRaw = JSON.parse(storedData) as XmtpStoredSigner;
        const signer: XmtpSigner = {
          walletAddress: signerRaw.walletAddress,
          keys: Buffer.from(signerRaw.keys, "hex"),
        };
        return signer;
      }
      return null;
    }

    return null;
  }

  useEffect(() => {
    const signer = getSignerFromLocalStorage();
    if (signer) setXmtpSigner(signer);
  }, []);

  useEffect(() => {
    if (xmtpSigner) {
      void Client.create(null, {
        privateKeyOverride: xmtpSigner.keys,
      }).then((client) => {
        setXmtpClient(client);
      });
    }
  }, [xmtpSigner]);

  function logout(): void {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.XMTP_SIGNER);
    setXmtpSigner(null);
  }

  async function onSignerlessFramePress(): Promise<void> {
    setLoading(true);
    await createAndStoreSigner();
    setLoading(false);
  }

  async function createAndStoreSigner(): Promise<void> {
    try {
      if (!xmtpSigner) {
        if (!walletSigner) {
          connect.openConnectModal?.();
          return;
        }
        const keys = await Client.getKeys(walletSigner, {
          env: "dev",
          skipContactPublishing: true,
          persistConversations: false,
        });

        const walletAddress = getAccount(config).address || zeroAddress;
        localStorage.setItem(
          LOCAL_STORAGE_KEYS.XMTP_SIGNER,
          JSON.stringify({
            walletAddress,
            keys: Buffer.from(keys).toString("hex"),
          } satisfies XmtpStoredSigner)
        );
        setXmtpSigner({
          keys,
          walletAddress,
        });
      }
    } catch (error) {
      console.error("frames.js: API Call failed", error);
    }
  }

  return {
    signer: xmtpSigner,
    hasSigner: !!xmtpSigner?.keys,
    async signFrameAction(actionContext) {
      if (!xmtpClient) {
        throw new Error("No xmtp client");
      }

      if (!address) {
        throw new Error("No address");
      }

      const framesClient = new FramesClient(xmtpClient);
      const payload = await framesClient.signFrameAction({
        frameUrl: actionContext.url,
        inputText: actionContext.inputText,
        state: actionContext.state,
        buttonIndex: actionContext.buttonIndex,
        conversationTopic: actionContext.frameContext.conversationTopic,
        participantAccountAddresses:
          actionContext.frameContext.participantAccountAddresses,
        ...(actionContext.frameContext.groupId
          ? { groupId: actionContext.frameContext.groupId }
          : {}),
        ...(actionContext.frameContext.groupSecret
          ? { groupSecret: actionContext.frameContext.groupSecret }
          : {}),
        address: actionContext.address,
        // transactionId: actionContext.transactionId, // TODO: enable when included upstream
      });

      const searchParams = new URLSearchParams({
        postType: actionContext.transactionId
          ? "post"
          : actionContext.frameButton.action,
        postUrl: actionContext.target ?? "",
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
