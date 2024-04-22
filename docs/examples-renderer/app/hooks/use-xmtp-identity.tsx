"use client";

import type { SignerStateInstance } from "@frames.js/render";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import type { FramePostPayload} from "@xmtp/frames-client";
import { FramesClient } from "@xmtp/frames-client";
import type { Signer } from "@xmtp/xmtp-js";
import { Client } from "@xmtp/xmtp-js";
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

type XmtpSignerRaw = {
  walletAddress: string;
  keys: string;
};

type XmtpSignerInstance = SignerStateInstance<
  XmtpSigner,
  FramePostPayload,
  XmtpFrameContext
>;

export function useXmtpIdentity(): XmtpSignerInstance {
  const [isLoading, setIsLoading] = useState(false);
  const [xmtpSigner, setXmtpSigner] = useState<XmtpSigner | null>(null);
  const [xmtpClient, setXmtpClient] = useState<Client<string | undefined> | null>(null);
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- we don't care atm
  function getSignerFromLocalStorage() {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEYS.XMTP_SIGNER);
      if (storedData) {
        const signerRaw = JSON.parse(storedData) as XmtpSignerRaw;
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
      }).then((client) => { setXmtpClient(client); });
    }
  }, [xmtpSigner]);

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- we don't care atm
  function logout() {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.XMTP_SIGNER);
    setXmtpSigner(null);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- we don't care atm
  async function onSignerlessFramePress() {
    setIsLoading(true);
    await createAndStoreSigner();
    setIsLoading(false);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/require-await -- we don't care atm
  async function createAndStoreSigner() {
    try {
      if (!xmtpSigner) {
        if (!walletSigner) {
          connect.openConnectModal?.();
          return;
        }
        void Client.getKeys(walletSigner, {
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
      // eslint-disable-next-line no-console -- we don't care
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
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- we don't care
    onSignerlessFramePress,
    logout,
  };
}
