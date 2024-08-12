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
import { usePersistedReducer } from "../../hooks/use-persisted-reducer";
import { IdentityPoller } from "./identity-poller";
import type { FarcasterSignedKeyRequest, FarcasterSigner } from "./types";

type State = FarcasterSigner | { status: "init" };

type Action =
  | {
      type: "IMPERSONATE";
      fid: number;
      privateKey: string;
      publicKey: string;
    }
  | { type: "LOGOUT" }
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
      signedKeyRequest: FarcasterSignedKeyRequest;
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

      return identity;
    }
    case "LOGOUT": {
      return { status: "init" };
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

      return identity;
    }
    case "FARCASTER_SIGN_IN_SUCCESS": {
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
  /**
   * Used to detect if the current context is visible, this affects the polling of the signer approval status.
   */
  visibilityChangeDetectionHook?: typeof useVisibilityDetection;
};

export type FarcasterSignerInstance =
  FarcasterSignerState<FarcasterSigner | null> & {
    createSigner: () => Promise<void>;
    impersonateUser: (fid: number) => Promise<void>;
    identityPoller: IdentityPoller;
  };

export function useFarcasterIdentity({
  onMissingIdentity,
  signerUrl = "/signer",
  storage,
  storageKey = "farcasterIdentity",
  visibilityChangeDetectionHook = useVisibilityDetection,
}: UseFarcasterIdentityOptions): FarcasterSignerInstance {
  // we use ref so we don't instantiate the storage if user passed their own storage
  const storageRef = useRef(storage ?? new WebStorage());
  const identityPoller = useRef(new IdentityPoller()).current;
  const [isLoading, setIsLoading] = useState(false);
  const [state, dispatch] = usePersistedReducer(
    identityReducer,
    { status: "init" as const },
    async () => {
      const storedState = await storageRef.current.getObject<State>(storageKey);

      if (
        !storedState ||
        (storedState.status === "pending_approval" &&
          storedState.deadline < Math.floor(Date.now() / 1000))
      ) {
        return {
          status: "init" as const,
        };
      }

      return storedState;
    },
    async (newState) => {
      await storageRef.current.setObject<State>(storageKey, newState);
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

  const farcasterUser = state.status === "init" ? null : state;

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
