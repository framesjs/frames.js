"use client";

import { useEffect, useState } from "react";
import {
  type FarcasterSignerState,
  type FarcasterSigner,
  signFrameAction,
} from "@frames.js/render";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { convertKeypairToHex, createKeypairEDDSA } from "../lib/crypto";

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
  const [isLoading, setIsLoading] = useState(false);
  const [farcasterSigner, setFarcasterSigner] =
    useState<FarcasterSigner | null>(getSignerFromLocalStorage());

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- we don't care atm
  async function impersonateUser({ fid }: { fid: number }) {
    const keypair = await createKeypairEDDSA();
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- we don't care atm
  function getSignerFromLocalStorage() {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem(
        LOCAL_STORAGE_KEYS.FARCASTER_USER
      );
      if (storedData) {
        const signer = JSON.parse(storedData) as FarcasterSigner;

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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- we don't care atm
  function logout() {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FARCASTER_USER, "");
    setFarcasterSigner(null);
  }

  useEffect(() => {
    if (farcasterSigner && farcasterSigner.status === "pending_approval") {
      let intervalId: NodeJS.Timeout;

      const startPolling = (): void => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- we don't care
        intervalId = setInterval(async () => {
          try {
            const fcSignerRequestResponse = await fetch(
              `https://api.warpcast.com/v2/signed-key-request?token=${farcasterSigner.token}`,
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
              ...farcasterSigner,
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
            // eslint-disable-next-line no-console -- we don't care
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
  }, [farcasterSigner]);

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- we don't care atm
  async function onSignerlessFramePress() {
    setIsLoading(true);
    await createAndStoreSigner();
    setIsLoading(false);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- we don't care atm
  async function createAndStoreSigner() {
    try {
      const keypair = await createKeypairEDDSA();
      const keypairString = convertKeypairToHex(keypair);
      const authorizationResponse = await fetch(`/signer`, {
        method: "POST",
        body: JSON.stringify({
          publicKey: keypairString.publicKey,
        }),
      });
      const authorizationBody = (await authorizationResponse.json()) as
        | {
            signature: string;
            requestFid: string;
            deadline: number;
            requestSigner: string;
          }
        | { code: number; message: string };
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
          deadline,
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
        // eslint-disable-next-line no-alert -- we don't care
        window.alert(
          (authorizationBody as { code: number; message: string }).message
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- we don't care
      console.error("frames.js: API Call failed", error);
    }
  }

  return {
    signer: farcasterSigner,
    hasSigner: !!farcasterSigner?.fid && !!farcasterSigner.privateKey,
    signFrameAction,
    isLoading: null,
    isLoadingSigner: isLoading,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- we don't care
    impersonateUser,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- we don't care
    onSignerlessFramePress,
    logout,
  };
}
