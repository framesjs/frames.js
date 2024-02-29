"use client";

import { useEffect, useState } from "react";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { FarcasterAuthState, FarcasterUser } from "../types/farcaster-user";
import { convertKeypairToHex, createKeypair } from "../lib/crypto";
import { createFrameActionMessageWithSignerKey } from "../lib/farcaster";

interface SignedKeyRequest {
  deeplinkUrl: string;
  isSponsored: boolean;
  key: string;
  requestFid: number;
  state: string;
  token: string;
  userFid: number;
  signerUser?: object;
  signerUserMetadata?: object;
}

type FarcasterIdentity = {
  user: FarcasterUser | null;
  isLoggedIn: boolean;
  signFrameAction: FarcasterAuthState["signFrameAction"];
  isLoading: boolean;
  impersonateUser: (args: { fid: number }) => Promise<void>;
  promptLogin: () => Promise<void>;
  logout: () => void;
};

export function useFarcasterIdentity(): FarcasterIdentity {
  const [isLoading, setLoading] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState<FarcasterUser | null>(
    getSignerFromLocalStorage()
  );

  async function impersonateUser({ fid }: { fid: number }) {
    const keypair = await createKeypair();
    const { privateKey, publicKey } = convertKeypairToHex(keypair);
    const user: FarcasterUser = {
      status: "impersonating",
      fid,
      // signature: "1",
      // is ignored for non pending
      // deadline: new Date().getTime(),
      privateKey,
      publicKey,
    };

    localStorage.setItem(
      LOCAL_STORAGE_KEYS.FARCASTER_USER,
      JSON.stringify(user)
    );

    setFarcasterUser(user);
  }

  function getSignerFromLocalStorage() {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem(
        LOCAL_STORAGE_KEYS.FARCASTER_USER
      );
      if (storedData) {
        const user: FarcasterUser = JSON.parse(storedData);

        if (user.status === "pending_approval") {
          // Validate that deadline hasn't passed
          if (user.deadline && user.deadline < Math.floor(Date.now() / 1000)) {
            localStorage.removeItem(LOCAL_STORAGE_KEYS.FARCASTER_USER);
            return null;
          }
        }

        return user;
      }
      return null;
    }

    return null;
  }

  useEffect(() => {
    const signer = getSignerFromLocalStorage();
    if (signer) setFarcasterUser(signer);
  }, []);

  function logout() {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FARCASTER_USER, "");
    setFarcasterUser(null);
  }

  useEffect(() => {
    if (farcasterUser && farcasterUser.status === "pending_approval") {
      let intervalId: any;

      const startPolling = () => {
        intervalId = setInterval(async () => {
          try {
            const fcSignerRequestResponse = await fetch(
              `https://api.warpcast.com/v2/signed-key-request?token=${farcasterUser.token}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
            const responseBody = (await fcSignerRequestResponse.json()) as {
              result: { signedKeyRequest: SignedKeyRequest };
            };
            if (responseBody.result.signedKeyRequest.state !== "completed") {
              throw new Error("hasnt succeeded yet");
            }

            const user = {
              ...farcasterUser,
              ...responseBody.result,
              fid: responseBody.result.signedKeyRequest.userFid,
              status: "approved" as const,
            };
            // store the user in local storage
            localStorage.setItem(
              LOCAL_STORAGE_KEYS.FARCASTER_USER,
              JSON.stringify(user)
            );

            setFarcasterUser(user);
            clearInterval(intervalId);
          } catch (error) {
            console.info(error);
          }
        }, 2000);
      };

      const stopPolling = () => {
        clearInterval(intervalId);
      };

      const handleVisibilityChange = () => {
        if (document.hidden) {
          stopPolling();
        } else {
          startPolling();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Start the polling when the effect runs.
      startPolling();

      // Cleanup function to remove the event listener and clear interval.
      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        clearInterval(intervalId);
      };
    }
  }, [farcasterUser]);

  async function promptLogin() {
    setLoading(true);
    await createAndStoreSigner();
    setLoading(false);
  }

  const signFrameAction: FarcasterAuthState["signFrameAction"] = async ({
    buttonIndex,
    frameContext,
    frameButton,
    target,
    inputText,
    url,
    state,
  }) => {
    if (!farcasterUser?.fid) {
      throw new Error("Missing data");
    }

    const { message, trustedBytes } =
      await createFrameActionMessageWithSignerKey(farcasterUser.privateKey, {
        fid: farcasterUser.fid,
        buttonIndex,
        castId: {
          fid: frameContext.castId.fid,
          hash: new Uint8Array(
            Buffer.from(frameContext.castId.hash.slice(2), "hex")
          ),
        },
        url: Buffer.from(url),
        // it seems the message in hubs actually requires a value here.
        inputText: inputText !== undefined ? Buffer.from(inputText) : undefined,
        state: state !== undefined ? Buffer.from(state) : undefined,
      });

    if (!message) {
      throw new Error("hub error");
    }

    const searchParams = new URLSearchParams({
      postType: frameButton?.action || "post",
      postUrl: target ?? "",
    });

    return {
      searchParams: searchParams,
      body: {
        untrustedData: {
          fid: farcasterUser.fid,
          url: url,
          messageHash: `0x${Buffer.from(message.hash).toString("hex")}`,
          timestamp: message.data.timestamp,
          network: 1,
          buttonIndex: Number(message.data.frameActionBody.buttonIndex),
          castId: {
            fid: frameContext.castId.fid,
            hash: frameContext.castId.hash,
          },
          inputText,
          state,
        },
        trustedData: {
          messageBytes: trustedBytes,
        },
      },
    };
  };

  async function createAndStoreSigner() {
    try {
      const keypair = await createKeypair();
      const keypairString = convertKeypairToHex(keypair);
      const authorizationResponse = await fetch(`/embed/signer`, {
        method: "POST",
        body: JSON.stringify({
          publicKey: keypairString.publicKey,
        }),
      });
      const authorizationBody: {
        signature: string;
        requestFid: string;
        deadline: number;
        requestSigner: string;
      } = await authorizationResponse.json();
      const { signature, requestFid, deadline } = authorizationBody;
      if (authorizationResponse.status === 200) {
        const {
          result: { signedKeyRequest },
        } = (await (
          await fetch(`https://api.warpcast.com/v2/signed-key-requests`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: keypairString.publicKey,
              signature,
              requestFid,
              deadline,
            }),
          })
        ).json()) as {
          result: { signedKeyRequest: { token: string; deeplinkUrl: string } };
        };

        const user: FarcasterUser = {
          ...authorizationBody,
          publicKey: keypairString.publicKey,
          deadline: deadline,
          token: signedKeyRequest.token,
          signerApprovalUrl: signedKeyRequest.deeplinkUrl,
          privateKey: keypairString.privateKey,
          status: "pending_approval",
        };
        localStorage.setItem(
          LOCAL_STORAGE_KEYS.FARCASTER_USER,
          JSON.stringify(user)
        );
        setFarcasterUser(user);
      }
    } catch (error) {
      console.error("API Call failed", error);
    }
  }

  return {
    user: farcasterUser,
    isLoggedIn: !!farcasterUser?.fid,
    signFrameAction,
    isLoading,
    impersonateUser,
    promptLogin,
    logout,
  };
}
