import {
  type Reducer,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { STORAGE_KEYS } from "../constants";
import { convertKeypairToHex, createKeypairEDDSA } from "../crypto";
import type {
  FarcasterSignerApproved,
  FarcasterSignerImpersonating,
  FarcasterSignerPendingApproval,
  FarcasterSignerState,
} from "../../farcaster";
import { signFrameAction } from "../../farcaster";
import type { Storage } from "../types";
import { useVisibilityDetection } from "../../hooks/use-visibility-detection";
import { WebStorage } from "../storage";
import { usePersistedReducer } from "../../hooks/use-persisted-reducer";
import { IdentityPoller } from "./identity-poller";

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

export type FarcasterSigner = (
  | FarcasterSignerPendingApproval
  | FarcasterSignerImpersonating
  | (FarcasterSignerApproved & { signedKeyRequest: SignedKeyRequest })
) & { _id: number };

type State = {
  activeIdentity: FarcasterSigner | null;
  identities: FarcasterSigner[];
};

type Action =
  | {
      type: "IMPERSONATE";
      fid: number;
      privateKey: string;
      publicKey: string;
    }
  | { type: "SELECT_IDENTITY"; _id: number }
  | { type: "LOGOUT" }
  | { type: "REMOVE" }
  | {
      type: "START_FARCASTER_SIGN_IN";
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
      type: "FARCASTER_SIGN_IN_SUCCESS";
      signedKeyRequest: SignedKeyRequest;
    };

const identityReducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case "IMPERSONATE": {
      const _id = Date.now();
      const identity: FarcasterSigner = {
        status: "impersonating",
        fid: action.fid,
        privateKey: action.privateKey,
        publicKey: action.publicKey,
        _id,
      };

      return {
        activeIdentity: identity,
        identities: state.identities.concat(identity),
      };
    }
    case "SELECT_IDENTITY": {
      const activeIdentity =
        state.identities.find((identity) => identity._id === action._id) ??
        null;

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
    case "START_FARCASTER_SIGN_IN": {
      const _id = Date.now();
      const identity: FarcasterSigner = {
        _id,
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
    case "FARCASTER_SIGN_IN_SUCCESS": {
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

type UseFarcasterIdentityOptions = {
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
   * Used to detect if the current context is visible, this affects the polling of the signer approval status.
   */
  visibilityChangeDetectionHook?: typeof useVisibilityDetection;
};

export type FarcasterSignerInstance =
  FarcasterSignerState<FarcasterSigner | null> & {
    createSigner: () => Promise<void>;
    impersonateUser: (fid: number) => Promise<void>;
    removeIdentity: () => Promise<void>;
    identities: FarcasterSigner[];
    selectIdentity: (id: number) => Promise<void>;
    identityPoller: IdentityPoller;
  };

export function useFarcasterIdentity({
  onMissingIdentity,
  signerUrl = "/signer",
  storage,
  visibilityChangeDetectionHook = useVisibilityDetection,
}: UseFarcasterIdentityOptions): FarcasterSignerInstance {
  // we use ref so we don't instantiate the storage if user passed their own storage
  const storageRef = useRef(storage ?? new WebStorage());
  const identityPoller = useRef(new IdentityPoller()).current;
  const [isLoading, setIsLoading] = useState(false);
  const [state, dispatch] = usePersistedReducer(
    identityReducer,
    {
      activeIdentity: null,
      identities: [],
    },
    async () => {
      const storedState = await storageRef.current.getObject<State>(
        STORAGE_KEYS.FARCASTER_IDENTITIES
      );

      if (!storedState) {
        return {
          activeIdentity: null,
          identities: [],
        };
      }

      const stateWithoutExpiredPendingApprovals: State = {
        activeIdentity: storedState.activeIdentity,
        identities: storedState.identities.filter(
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
    async (newState) => {
      await storageRef.current.setObject(
        STORAGE_KEYS.FARCASTER_IDENTITIES,
        newState
      );
    }
  );

  const createFarcasterSigner = useCallback(async () => {
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

        await dispatch({
          type: "START_FARCASTER_SIGN_IN",
          publicKey: keypairString.publicKey,
          privateKey: keypairString.privateKey,
          deadline,
          token: signedKeyRequest.token,
          signerApprovalUrl: signerApprovalUrl.toString(),
          requestFid: parseInt(requestFid, 10),
          requestSigner,
          signature,
        });
      } else if ("message" in authorizationBody) {
        throw new Error(authorizationBody.message);
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- provide feedback
      console.error("@frames.js/render: API Call failed", error);
    }
  }, [dispatch, signerUrl]);

  const impersonateUser = useCallback(
    async (fid: number) => {
      try {
        setIsLoading(true);

        const keypair = await createKeypairEDDSA();
        const { privateKey, publicKey } = convertKeypairToHex(keypair);

        await dispatch({ type: "IMPERSONATE", fid, privateKey, publicKey });
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, setIsLoading]
  );

  const onSignerlessFramePress = useCallback((): Promise<void> => {
    onMissingIdentity();

    return Promise.resolve();
  }, [onMissingIdentity]);

  const createSigner = useCallback(async () => {
    setIsLoading(true);
    await createFarcasterSigner();
    setIsLoading(false);
  }, [createFarcasterSigner]);

  const logout = useCallback(async () => {
    await dispatch({ type: "LOGOUT" });
  }, [dispatch]);

  const removeIdentity = useCallback(async () => {
    await dispatch({ type: "REMOVE" });
  }, [dispatch]);

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
              return dispatch({
                type: "FARCASTER_SIGN_IN_SUCCESS",
                signedKeyRequest,
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
  }, [farcasterUser, identityPoller, visibilityDetector, dispatch]);

  const selectIdentity = useCallback(
    async (id: number) => {
      await dispatch({ type: "SELECT_IDENTITY", _id: id });
    },
    [dispatch]
  );

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
      removeIdentity,
      identities: state.identities,
      selectIdentity,
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
      removeIdentity,
      selectIdentity,
      state.identities,
    ]
  );
}
