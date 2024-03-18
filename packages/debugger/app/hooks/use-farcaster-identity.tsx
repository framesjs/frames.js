"use client";

import { useEffect, useState } from "react";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { convertKeypairToHex, createKeypair } from "../lib/crypto";
import {
  FarcasterSignerState,
  FarcasterSigner,
  signFrameAction,
} from "frames.js/render";

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

export function useFarcasterIdentity(): FarcasterSignerState & {
  impersonateUser: ({ fid }: { fid: number }) => void;
} {
  const [isLoading, setLoading] = useState(false);
  const [farcasterUser, setFarcasterSigner] = useState<FarcasterSigner | null>(
    getSignerFromLocalStorage()
  );

  async function impersonateUser({ fid }: { fid: number }) {
    const keypair = await createKeypair();
    const { privateKey, publicKey } = convertKeypairToHex(keypair);
    const signer: FarcasterSigner = {
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
      JSON.stringify(signer)
    );

    setFarcasterSigner(signer);
  }

  function getSignerFromLocalStorage() {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem(
        LOCAL_STORAGE_KEYS.FARCASTER_USER
      );
      if (storedData) {
        const signer: FarcasterSigner = JSON.parse(storedData);

        if (signer.status === "pending_approval") {
          // Validate that deadline hasn't passed
          if (
            signer.deadline &&
            signer.deadline < Math.floor(Date.now() / 1000)
          ) {
            localStorage.removeItem(LOCAL_STORAGE_KEYS.FARCASTER_USER);
            return null;
          }
        }

        return signer;
      }
      return null;
    }

    return null;
  }

  useEffect(() => {
    const signer = getSignerFromLocalStorage();
    if (signer) setFarcasterSigner(signer);
  }, []);

  function logout() {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FARCASTER_USER, "");
    setFarcasterSigner(null);
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

            setFarcasterSigner(user);
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

  async function onSignerlessFramePress() {
    setLoading(true);
    await createAndStoreSigner();
    setLoading(false);
  }

  async function createAndStoreSigner() {
    try {
      const keypair = await createKeypair();
      const keypairString = convertKeypairToHex(keypair);
      const authorizationResponse = await fetch(`/signer`, {
        method: "POST",
        body: JSON.stringify({
          publicKey: keypairString.publicKey,
        }),
      });
      const authorizationBody:
        | {
            signature: string;
            requestFid: string;
            deadline: number;
            requestSigner: string;
          }
        | { code: number; message: string } =
        await authorizationResponse.json();
      if (authorizationResponse.status === 200) {
        const { signature, requestFid, deadline } = authorizationBody as {
          signature: string;
          requestFid: string;
          deadline: number;
          requestSigner: string;
        };

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

        const signer: FarcasterSigner = {
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
          JSON.stringify(signer)
        );
        setFarcasterSigner(signer);
      } else if (
        (authorizationBody as { code: number; message: string }).code === 1
      ) {
        window.alert(
          (authorizationBody as { code: number; message: string }).message
        );
      }
    } catch (error) {
      console.error("frames.js: API Call failed", error);
    }
  }

  return {
    signer: farcasterUser,
    hasSigner: !!farcasterUser?.fid && !!farcasterUser.privateKey,
    signFrameAction: signFrameAction,
    isLoading: null,
    isLoadingSigner: isLoading,
    impersonateUser,
    onSignerlessFramePress,
    logout,
  };
}
