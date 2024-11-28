import { useConnectModal } from "@rainbow-me/rainbowkit";
import { type FramePostPayload, FramesClient } from "@xmtp/frames-client";
import { Client, type Signer } from "@xmtp/xmtp-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zeroAddress } from "viem";
import { useAccount, useSignMessage } from "wagmi";
import type { Storage } from "../types";
import type {
  SignerStateActionContext,
  SignerStateInstance,
  SignFrameActionFunction,
} from "../../types";
import { WebStorage } from "../storage";
import { useFreshRef } from "../../hooks/use-fresh-ref";
import type { XmtpFrameContext } from "./use-xmtp-context";

export type XmtpSigner = {
  walletAddress: string;
  keys: Uint8Array;
};

type XmtpStoredSigner = {
  walletAddress: string;
  keys: string;
};

export type XmtpSignerInstance = SignerStateInstance<
  XmtpSigner,
  FramePostPayload,
  XmtpFrameContext
>;

type XmtpIdentityOptions = {
  /**
   * @defaultValue WebStorage
   */
  storage?: Storage;
  /**
   * @defaultValue "xmtpSigner"
   */
  storageKey?: string;
};

const defaultStorage = new WebStorage();

export function useXmtpIdentity({
  storage = defaultStorage,
  storageKey = "xmtpSigner",
}: XmtpIdentityOptions = {}): XmtpSignerInstance {
  const storageRef = useRef(storage);
  const [isLoading, setIsLoading] = useState(false);
  const [xmtpSigner, setXmtpSigner] = useState<XmtpSigner | null>(null);
  const [xmtpClient, setXmtpClient] = useState<Client | null>(null);
  const connect = useConnectModal();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const walletSigner: Signer | null = useMemo(
    () =>
      address
        ? {
            getAddress() {
              return Promise.resolve(address);
            },
            signMessage(message) {
              return signMessageAsync({
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
    [address, signMessageAsync]
  );

  useEffect(() => {
    async function instantiateXmtpSignerAndClient(): Promise<void> {
      const storedSigner =
        await storageRef.current.get<XmtpStoredSigner>(storageKey);

      if (!storedSigner) {
        return;
      }

      const signer: XmtpSigner = {
        walletAddress: storedSigner.walletAddress,
        keys: Buffer.from(storedSigner.keys, "hex"),
      };

      const client = await Client.create(null, {
        privateKeyOverride: signer.keys,
      });

      setXmtpSigner(signer);
      setXmtpClient(client);
    }

    instantiateXmtpSignerAndClient().catch((e) => {
      // eslint-disable-next-line no-console -- provide feedback
      console.error(
        "@frames.js/render: Could not instantiate the XMTP signer and client",
        e
      );
    });
  }, [storageKey]);

  const logout = useCallback(async () => {
    await storageRef.current.delete(storageKey);

    setXmtpClient(null);
    setXmtpSigner(null);
  }, [storageKey]);

  const walletSignerRef = useFreshRef(walletSigner);
  const xmtpSignerRef = useFreshRef(xmtpSigner);
  const connectRef = useFreshRef(connect);
  const xmtpClientRef = useFreshRef(xmtpClient);
  const addressRef = useFreshRef(address);
  const storageKeyRef = useFreshRef(storageKey);

  const onSignerlessFramePress = useCallback(async (): Promise<void> => {
    try {
      const wallet = walletSignerRef.current;
      const signer = xmtpSignerRef.current;

      setIsLoading(true);

      if (!signer) {
        if (!wallet) {
          connectRef.current.openConnectModal?.();
          return;
        }

        const keys = await Client.getKeys(wallet, {
          env: "dev",
          skipContactPublishing: true,
          persistConversations: false,
        });
        const client = await Client.create(null, {
          privateKeyOverride: keys,
        });

        const walletAddress = addressRef.current || zeroAddress;

        await storageRef.current.set<XmtpStoredSigner>(
          storageKeyRef.current,
          () => ({
            walletAddress,
            keys: Buffer.from(keys).toString("hex"),
          })
        );

        setXmtpSigner({
          keys,
          walletAddress,
        });
        setXmtpClient(client);
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- provide feedback
      console.error("@frames.js/render: API Call failed", error);
    } finally {
      setIsLoading(false);
    }
  }, [walletSignerRef, xmtpSignerRef, addressRef, storageKeyRef, connectRef]);

  const signFrameAction: SignFrameActionFunction<
    SignerStateActionContext<XmtpSigner, XmtpFrameContext>,
    FramePostPayload
  > = useCallback(
    async (actionContext) => {
      const client = xmtpClientRef.current;

      if (!client) {
        throw new Error("No xmtp client");
      }

      const framesClient = new FramesClient(client);
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
        ...(actionContext.type === "tx-data" || actionContext.type === "tx-post"
          ? { address: actionContext.address }
          : {}),
        ...(actionContext.type === "tx-post"
          ? { transactionId: actionContext.transactionId }
          : {}),
      });

      const searchParams = new URLSearchParams({
        postType:
          actionContext.type === "tx-post"
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
    [xmtpClientRef]
  );

  const isLoadingRef = useFreshRef(isLoading);

  return useMemo(() => {
    /**
     * See the explanation in useFarcasterIdentity()
     */
    void xmtpSigner;
    void isLoading;

    return {
      specification: "openframes",
      get signer() {
        return xmtpSignerRef.current;
      },
      get hasSigner() {
        return !!xmtpSignerRef.current?.keys;
      },
      signFrameAction,
      get isLoadingSigner() {
        return isLoadingRef.current;
      },
      onSignerlessFramePress,
      logout,
      withContext(frameContext, overrides) {
        return {
          signerState: {
            ...this,
            ...overrides,
          },
          frameContext,
        };
      },
    };
  }, [
    isLoading,
    isLoadingRef,
    logout,
    onSignerlessFramePress,
    signFrameAction,
    xmtpSigner,
    xmtpSignerRef,
  ]);
}
