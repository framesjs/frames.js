import {
  type Reducer,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { convertKeypairToHex, createKeypairEDDSA } from "../crypto";
import type { FarcasterSignerState } from "../../farcaster";
import { signFrameAction } from "../../farcaster";
import type { Storage } from "../types";
import { useVisibilityDetection } from "../../hooks/use-visibility-detection";
import { WebStorage } from "../storage";
import { useStorage } from "../../hooks/use-storage";
import { IdentityPoller } from "./identity-poller";
import type {
  FarcasterCreateSignerResult,
  FarcasterSignedKeyRequest,
  FarcasterSigner,
  FarcasterSignerApproved,
  FarcasterSignerImpersonating,
  FarcasterSignerPendingApproval,
} from "./types";

type State = FarcasterSigner | { status: "init" };

type Action =
  | {
      type: "IMPERSONATE";
      id: string | number;
      fid: number;
      privateKey: string;
      publicKey: string;
    }
  | { type: "LOGOUT" }
  | {
      type: "LOGIN_START";
      id: string | number;
      publicKey: string;
      privateKey: string;
      deadline: number;
      token: string;
      signerApprovalUrl: string;
      requestFid: number;
      requestSigner: string;
      signature: string;
    }
  | {
      type: "LOGIN_SUCCESS";
      signedKeyRequest: FarcasterSignedKeyRequest;
    };

const identityReducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case "IMPERSONATE": {
      const identity: FarcasterSigner = {
        status: "impersonating",
        fid: action.fid,
        privateKey: action.privateKey,
        publicKey: action.publicKey,
        _id: action.id,
      };

      return identity;
    }
    case "LOGOUT": {
      return { status: "init" };
    }
    case "LOGIN_START": {
      const identity: FarcasterSigner = {
        _id: action.id,
        status: "pending_approval",
        privateKey: action.privateKey,
        publicKey: action.publicKey,
        token: action.token,
        deadline: action.deadline,
        signerApprovalUrl: action.signerApprovalUrl,
        requestFid: action.requestFid,
        requestSigner: action.requestSigner,
        signature: action.signature,
      };

      return identity;
    }
    case "LOGIN_SUCCESS": {
      if (state.status !== "pending_approval") {
        // eslint-disable-next-line no-console -- provide feedback
        console.warn(
          "Active identity must be selected and be in pending_approval status to be approved"
        );

        return state;
      }

      const updatedIdentity: FarcasterSigner = {
        ...state,
        status: "approved",
        fid: action.signedKeyRequest.userFid,
        signedKeyRequest: action.signedKeyRequest,
      };

      return updatedIdentity;
    }
    default:
      return state;
  }
};

type UseFarcasterIdentityOptions = {
  /**
   * Called when it is required to create a new signer in order to proceed
   */
  onMissingIdentity: () => void;
  /**
   * Allows you to disable the polling of the signer approval status
   * when user starts signin in
   *
   * @defaultValue true
   */
  enableIdentityPolling?: boolean;
  /**
   * URL to signer endpoint
   *
   * @defaultValue '/signer'
   */
  signerUrl?: string;
  /**
   * @defaultValue WebStorage
   */
  storage?: Storage;
  /**
   * @defaultValue 'farcasterIdentity'
   */
  storageKey?: string;
  generateUserId?: () => string | number;
  /**
   * Used to detect if the current context is visible, this affects the polling of the signer approval status.
   */
  visibilityChangeDetectionHook?: typeof useVisibilityDetection;
  onImpersonate?: (identity: FarcasterSignerImpersonating) => void;
  onLogIn?: (identity: FarcasterSignerApproved) => void;
  onLogInStart?: (identity: FarcasterSignerPendingApproval) => void;
  onLogOut?: (identity: FarcasterSigner) => void;
};

export type FarcasterSignerInstance =
  FarcasterSignerState<FarcasterSigner | null> & {
    createSigner: () => Promise<FarcasterCreateSignerResult>;
    impersonateUser: (fid: number) => Promise<void>;
    identityPoller: IdentityPoller;
  };

const defaultStorage = new WebStorage();
const defaultGenerateUserId = (): number => {
  return Date.now();
};

export function useFarcasterIdentity({
  onMissingIdentity,
  enableIdentityPolling = true,
  signerUrl = "/signer",
  storage = defaultStorage,
  storageKey = "farcasterIdentity",
  visibilityChangeDetectionHook = useVisibilityDetection,
  onImpersonate,
  onLogIn,
  onLogInStart,
  onLogOut,
  generateUserId = defaultGenerateUserId,
}: UseFarcasterIdentityOptions): FarcasterSignerInstance {
  const storageRef = useRef(storage);
  const identityPoller = useRef(new IdentityPoller()).current;
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useStorage<State>({
    key: storageKey,
    storage: storageRef.current,
    initialValue: { status: "init" },
    preprocessValue(value) {
      if (
        value.status === "pending_approval" &&
        value.deadline < Math.floor(Date.now() / 1000)
      ) {
        return { status: "init" };
      }

      return value;
    },
  });
  const onImpersonateRef = useRef(onImpersonate);
  onImpersonateRef.current = onImpersonate;
  const onLogInRef = useRef(onLogIn);
  onLogInRef.current = onLogIn;
  const onLogInStartRef = useRef(onLogInStart);
  onLogInStartRef.current = onLogInStart;
  const onLogOutRef = useRef(onLogOut);
  onLogOutRef.current = onLogOut;
  const generateUserIdRef = useRef(generateUserId);
  generateUserIdRef.current = generateUserId;

  const createFarcasterSigner =
    useCallback(async (): Promise<FarcasterCreateSignerResult> => {
      try {
        const keypair = await createKeypairEDDSA();
        const keypairString = convertKeypairToHex(keypair);
        const authorizationResponse = await fetch(
          // real signer or local one are handled by local route so we don't need to expose anything to client side bundle
          signerUrl,
          {
            method: "POST",
            body: JSON.stringify({
              publicKey: keypairString.publicKey,
            }),
          }
        );
        const authorizationBody = (await authorizationResponse.json()) as
          | {
              signature: string;
              requestFid: string;
              deadline: number;
              requestSigner: string;
            }
          | { code: number; message: string };

        if (authorizationResponse.status === 200) {
          const { signature, requestFid, deadline, requestSigner } =
            authorizationBody as {
              signature: string;
              requestFid: string;
              deadline: number;
              requestSigner: string;
            };

          const {
            result: { signedKeyRequest },
          } = (await (
            await fetch(`https://client.warpcast.com/deeplinks/signed-key-request`, {
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
            result: {
              signedKeyRequest: { token: string; deeplinkUrl: string };
            };
          };

          // this deeplink works only on iOS, make sure it works on android too by using app link
          const deepLinkUrl = new URL(signedKeyRequest.deeplinkUrl);
          const signedKeyRequestToken = deepLinkUrl.searchParams.get("token");
          const signerApprovalUrl = new URL(
            "https://client.warpcast.com/deeplinks/signed-key-request"
          );

          if (!signedKeyRequestToken) {
            throw new Error("No token found in the deep link URL");
          }

          signerApprovalUrl.searchParams.set("token", signedKeyRequestToken);

          await setState((currentState) => {
            const newState = identityReducer(currentState, {
              type: "LOGIN_START",
              id: generateUserIdRef.current(),
              publicKey: keypairString.publicKey,
              privateKey: keypairString.privateKey,
              deadline,
              token: signedKeyRequestToken,
              signerApprovalUrl: signerApprovalUrl.toString(),
              requestFid: parseInt(requestFid, 10),
              requestSigner,
              signature,
            });

            if (newState.status === "pending_approval") {
              onLogInStartRef.current?.(newState);
            }

            return newState;
          });

          return {
            token: signedKeyRequestToken,
            signerApprovalUrl: signerApprovalUrl.toString(),
          };
        } else if ("message" in authorizationBody) {
          throw new Error(authorizationBody.message);
        }

        throw new Error("Could not request signer approval");
      } catch (error) {
        // eslint-disable-next-line no-console -- provide feedback
        console.error("@frames.js/render: API Call failed", error);
        throw error;
      }
    }, [setState, signerUrl]);

  const impersonateUser = useCallback(
    async (fid: number) => {
      try {
        setIsLoading(true);

        const keypair = await createKeypairEDDSA();
        const { privateKey, publicKey } = convertKeypairToHex(keypair);

        await setState((currentState) => {
          const newState = identityReducer(currentState, {
            type: "IMPERSONATE",
            id: generateUserIdRef.current(),
            fid,
            privateKey,
            publicKey,
          });

          if (newState.status === "impersonating") {
            onImpersonateRef.current?.(newState);
          }

          return newState;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [setState]
  );

  const onSignerlessFramePress = useCallback((): Promise<void> => {
    onMissingIdentity();

    return Promise.resolve();
  }, [onMissingIdentity]);

  const createSigner = useCallback(async () => {
    setIsLoading(true);
    const result = await createFarcasterSigner();
    setIsLoading(false);

    return result;
  }, [createFarcasterSigner]);

  const logout = useCallback(async () => {
    await setState((currentState) => {
      if (currentState.status !== "init") {
        onLogOutRef.current?.(currentState);
      }

      return identityReducer(currentState, { type: "LOGOUT" });
    });
  }, [setState]);

  const farcasterUser = state.status === "init" ? null : state;

  const visibilityDetector = visibilityChangeDetectionHook();

  useEffect(() => {
    if (
      farcasterUser &&
      farcasterUser.status === "pending_approval" &&
      enableIdentityPolling
    ) {
      const startPolling = (): void => {
        // start polling because the effect is active
        identityPoller
          .start(farcasterUser.token)
          .then((signedKeyRequest) => {
            if (signedKeyRequest) {
              return setState((currentState) => {
                const newState = identityReducer(currentState, {
                  type: "LOGIN_SUCCESS",
                  signedKeyRequest,
                });

                if (newState.status === "approved") {
                  onLogInRef.current?.(newState);
                }

                return newState;
              });
            }
          })
          .catch((e) => {
            // eslint-disable-next-line no-console -- provide feedback
            console.error(
              "Error while polling for the signer approval status",
              e
            );
          });
      };

      const unregisterVisibilityChangeListener = visibilityDetector.register(
        (visible) => {
          if (visible) {
            startPolling();
          } else {
            identityPoller.stop();
          }
        }
      );

      startPolling();

      return () => {
        identityPoller.stop();
        unregisterVisibilityChangeListener();
      };
    }
  }, [
    farcasterUser,
    identityPoller,
    visibilityDetector,
    setState,
    enableIdentityPolling,
  ]);

  return useMemo(
    () => ({
      signer: farcasterUser,
      hasSigner:
        farcasterUser?.status === "approved" ||
        farcasterUser?.status === "impersonating",
      signFrameAction,
      isLoadingSigner: isLoading,
      impersonateUser,
      onSignerlessFramePress,
      createSigner,
      logout,
      identityPoller,
    }),
    [
      farcasterUser,
      identityPoller,
      impersonateUser,
      isLoading,
      logout,
      createSigner,
      onSignerlessFramePress,
    ]
  );
}
