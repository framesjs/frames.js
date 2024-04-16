"use client";

import { useEffect, useMemo, useState } from "react";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { convertKeypairToHex, createKeypairEDDSA } from "../lib/crypto";
import {
  type FarcasterSigner,
  signFrameAction,
  SignerStateInstance,
} from "@frames.js/render";
import { Client, Signer } from "@xmtp/xmtp-js";
import { FramesClient } from "@xmtp/frames-client";
import { signMessage, getAccount } from "wagmi/actions";
import { useAccount, useConfig } from "wagmi";
import { zeroAddress } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";

type XmtpSigner = {
  walletAddress: string;
  keys: Uint8Array;
};

type XmtpSignerInstance = SignerStateInstance<XmtpSigner>;

export function useXmtpIdentity(): XmtpSignerInstance {
  const [isLoading, setLoading] = useState(false);
  const [xmtpSigner, setXmtpSigner] = useState<XmtpSigner | null>(null);
  const [xmtpClient, setXmtpClient] = useState<any>(null);
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

  function getSignerFromLocalStorage() {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEYS.XMTP_SIGNER);
      if (storedData) {
        const signerRaw = JSON.parse(storedData);
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
      Client.create(null, {
        privateKeyOverride: xmtpSigner.keys,
      }).then((client) => setXmtpClient(client));
    }
  }, [xmtpSigner]);

  function logout() {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.XMTP_SIGNER);
    setXmtpSigner(null);
  }

  async function onSignerlessFramePress() {
    setLoading(true);
    await createAndStoreSigner();
    setLoading(false);
  }

  async function createAndStoreSigner() {
    try {
      if (!xmtpSigner) {
        if (!walletSigner) {
          connect.openConnectModal?.();
          return;
        }
        Client.getKeys(walletSigner, {
          env: "dev",
          skipContactPublishing: true,
          persistConversations: false,
        }).then((keys) => {
          const walletAddress = getAccount(config).address || zeroAddress;
          localStorage.setItem(
            LOCAL_STORAGE_KEYS.XMTP_SIGNER,
            JSON.stringify({
              walletAddress,
              keys: Buffer.from(keys).toString("hex"),
            })
          );
          setXmtpSigner({
            keys,
            walletAddress,
          });
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
        conversationTopic: "/xmtp/0/123",
        participantAccountAddresses: [address, zeroAddress],
      });

      const searchParams = new URLSearchParams({
        postType: actionContext.transactionId
          ? "post"
          : actionContext.frameButton.action,
        postUrl: actionContext.frameButton.target ?? "",
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
