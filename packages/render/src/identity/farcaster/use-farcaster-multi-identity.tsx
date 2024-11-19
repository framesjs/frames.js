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
import { signComposerAction, signFrameAction } from "../../farcaster";
import type { Storage } from "../types";
import { useVisibilityDetection } from "../../hooks/use-visibility-detection";
import { WebStorage } from "../storage";
import { useStorage } from "../../hooks/use-storage";
import { useFreshRef } from "../../hooks/use-fresh-ref";
import { IdentityPoller } from "./identity-poller";
import type {
  FarcasterCreateSignerResult,
  FarcasterSignedKeyRequest,
  FarcasterSigner,
  FarcasterSignerApproved,
  FarcasterSignerImpersonating,
  FarcasterSignerPendingApproval,
} from "./types";

type State = {
  activeIdentity: FarcasterSigner | null;
  identities: FarcasterSigner[];
};

type Action =
  | {
      type: "IMPERSONATE";
      id: number | string;
      fid: number;
      privateKey: string;
      publicKey: string;
    }
  | { type: "SELECT_IDENTITY"; id: number | string }
  | { type: "LOGOUT" }
  | { type: "REMOVE" }
  | {
      type: "LOGIN_START";
      id: number | string;
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

      return {
        activeIdentity: identity,
        identities: state.identities.concat(identity),
      };
    }
    case "SELECT_IDENTITY": {
      const activeIdentity =
        state.identities.find((identity) => identity._id === action.id) ?? null;

      return {
        ...state,
        activeIdentity,
      };
    }
    case "LOGOUT": {
      return {
        activeIdentity: null,
        identities: state.identities,
      };
    }
    case "REMOVE": {
      const { activeIdentity } = state;

      if (!activeIdentity) {
        return state;
      }

      return {
        activeIdentity: null,
        identities: state.identities.filter(
          (identity) => identity._id !== activeIdentity._id
        ),
      };
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

      const identities = [
        ...state.identities
          // Remove all current pending approvals
          .filter(
            (storedIdentity) => storedIdentity.status !== "pending_approval"
          ),
        // Add new pending approval
        identity,
      ];

      return {
        activeIdentity: identity,
        identities,
      };
    }
    case "LOGIN_SUCCESS": {
      const { activeIdentity } = state;

      if (activeIdentity?.status !== "pending_approval") {
        // eslint-disable-next-line no-console -- provide feedback
        console.warn(
          "Active identity must be selected and be in pending_approval status to be approved"
        );

        return state;
      }

      const updatedActiveIdentity: FarcasterSigner = {
        ...activeIdentity,
        status: "approved",
        fid: action.signedKeyRequest.userFid,
        signedKeyRequest: action.signedKeyRequest,
      };

      return {
        activeIdentity: updatedActiveIdentity,
        identities: state.identities.map((identity) => {
          if (identity._id === activeIdentity._id) {
            return updatedActiveIdentity;
          }

          return identity;
        }),
      };
    }
    default:
      return state;
  }
};

type UseFarcasterMultiIdentityOptions = {
  /**
   * Called when it is required to create a new signer in order to proceed
   */
  onMissingIdentity: () => void;
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
   * @defaultValue 'farcasterIdentities'
   */
  storageKey?: string;
  /**
   * Used to detect if the current context is visible, this affects the polling of the signer approval status.
   */
  visibilityChangeDetectionHook?: typeof useVisibilityDetection;
  onImpersonate?: (identity: FarcasterSignerImpersonating) => void;
  onLogIn?: (identity: FarcasterSignerApproved) => void;
  onLogInStart?: (identity: FarcasterSignerPendingApproval) => void;
  onLogOut?: (identity: FarcasterSigner) => void;
  onIdentityRemove?: (identity: FarcasterSigner) => void;
  onIdentitySelect?: (identity: FarcasterSigner) => void;
  generateUserId?: () => string | number;
};

export type FarcasterMultiSignerInstance =
  FarcasterSignerState<FarcasterSigner | null> & {
    createSigner: () => Promise<FarcasterCreateSignerResult>;
    impersonateUser: (fid: number) => Promise<void>;
    removeIdentity: () => Promise<void>;
    identities: FarcasterSigner[];
    selectIdentity: (id: number | string) => Promise<void>;
    identityPoller: IdentityPoller;
  };

const defaultStorage = new WebStorage();
const defaultGenerateUserId = (): number => Date.now();

type SignedKeyRequestSponsorship = {
  sponsorFid: number;
  signature: string;
};

export function useFarcasterMultiIdentity({
  onMissingIdentity,
  signerUrl = "/signer",
  storage = defaultStorage,
  storageKey = "farcasterIdentities",
  visibilityChangeDetectionHook = useVisibilityDetection,
  onImpersonate,
  onLogIn,
  onLogInStart,
  onLogOut,
  onIdentityRemove,
  onIdentitySelect,
  generateUserId = defaultGenerateUserId,
}: UseFarcasterMultiIdentityOptions): FarcasterMultiSignerInstance {
  const storageRef = useRef(storage);
  const identityPoller = useRef(new IdentityPoller()).current;
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useStorage<State>({
    key: storageKey,
    storage: storageRef.current,
    preprocessValue(value) {
      const stateWithoutExpiredPendingApprovals: State = {
        activeIdentity: value.activeIdentity,
        identities: value.identities.filter(
          (signer) =>
            signer.status !== "pending_approval" ||
            (signer.deadline && signer.deadline > Math.floor(Date.now() / 1000))
        ),
      };

      stateWithoutExpiredPendingApprovals.activeIdentity =
        stateWithoutExpiredPendingApprovals.identities.find(
          (identity) =>
            identity._id ===
            stateWithoutExpiredPendingApprovals.activeIdentity?._id
        ) ?? null;

      return stateWithoutExpiredPendingApprovals;
    },
    initialValue: {
      activeIdentity: null,
      identities: [],
    },
  });
  const onImpersonateRef = useFreshRef(onImpersonate);
  const onLogInRef = useFreshRef(onLogIn);
  const onLogInStartRef = useFreshRef(onLogInStart);
  const onLogOutRef = useFreshRef(onLogOut);
  const onIdentityRemoveRef = useFreshRef(onIdentityRemove);
  const onIdentitySelectRef = useFreshRef(onIdentitySelect);
  const generateUserIdRef = useFreshRef(generateUserId);
  const onMissingIdentityRef = useFreshRef(onMissingIdentity);

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
              sponsorship?: SignedKeyRequestSponsorship;
            }
          | { code: number; message: string };

        if (authorizationResponse.status === 200) {
          const {
            signature,
            requestFid,
            deadline,
            requestSigner,
            sponsorship,
          } = authorizationBody as {
            signature: string;
            requestFid: string;
            deadline: number;
            requestSigner: string;
            sponsorship?: SignedKeyRequestSponsorship;
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
                sponsorship,
              }),
            })
          ).json()) as {
            result: {
              signedKeyRequest: {
                token: string;
                deeplinkUrl: string;
                isSponsored: boolean;
              };
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

            if (newState.activeIdentity?.status === "pending_approval") {
              onLogInStartRef.current?.(newState.activeIdentity);
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

        throw new Error("Could not request signer approval.");
      } catch (error) {
        // eslint-disable-next-line no-console -- provide feedback
        console.error("@frames.js/render: API Call failed", error);
        throw error;
      }
    }, [generateUserIdRef, onLogInStartRef, setState, signerUrl]);

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

          if (newState.activeIdentity?.status === "impersonating") {
            onImpersonateRef.current?.(newState.activeIdentity);
          }

          return newState;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [generateUserIdRef, onImpersonateRef, setState]
  );

  const onSignerlessFramePress = useCallback((): Promise<void> => {
    onMissingIdentityRef.current();

    return Promise.resolve();
  }, [onMissingIdentityRef]);

  const createSigner = useCallback(async () => {
    setIsLoading(true);
    const result = await createFarcasterSigner();
    setIsLoading(false);

    return result;
  }, [createFarcasterSigner]);

  const logout = useCallback(async () => {
    await setState((currentState) => {
      if (currentState.activeIdentity) {
        onLogOutRef.current?.(currentState.activeIdentity);
      }

      return identityReducer(currentState, { type: "LOGOUT" });
    });
  }, [onLogOutRef, setState]);

  const removeIdentity = useCallback(async () => {
    await setState((currentState) => {
      if (currentState.activeIdentity) {
        onIdentityRemoveRef.current?.(currentState.activeIdentity);
      }

      return identityReducer(currentState, { type: "REMOVE" });
    });
  }, [onIdentityRemoveRef, setState]);

  const farcasterUser = state.activeIdentity;

  const visibilityDetector = visibilityChangeDetectionHook();

  useEffect(() => {
    if (farcasterUser && farcasterUser.status === "pending_approval") {
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

                if (newState.activeIdentity?.status === "approved") {
                  onLogInRef.current?.(newState.activeIdentity);
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
  }, [farcasterUser, identityPoller, visibilityDetector, setState]);

  const selectIdentity = useCallback(
    async (id: number | string) => {
      await setState((currentState) => {
        const newState = identityReducer(currentState, {
          type: "SELECT_IDENTITY",
          id,
        });

        if (newState.activeIdentity) {
          onIdentitySelectRef.current?.(newState.activeIdentity);
        }

        return newState;
      });
    },
    [setState]
  );

  return useMemo(
    () => ({
      specification: "farcaster",
      signer: farcasterUser,
      hasSigner:
        farcasterUser?.status === "approved" ||
        farcasterUser?.status === "impersonating",
      signFrameAction,
      signComposerAction,
      isLoadingSigner: isLoading,
      impersonateUser,
      onSignerlessFramePress,
      createSigner,
      logout,
      removeIdentity,
      identities: state.identities,
      selectIdentity,
      identityPoller,
      withContext(frameContext) {
        return {
          signerState: this,
          frameContext,
        };
      },
    }),
    [
      farcasterUser,
      identityPoller,
      impersonateUser,
      isLoading,
      logout,
      createSigner,
      onSignerlessFramePress,
      removeIdentity,
      selectIdentity,
      state.identities,
    ]
  );
}
