import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type {
  ComposerActionFormResponse,
  ComposerActionState,
} from "frames.js/types";
import type { FarcasterSignerState } from "./farcaster";
import { useFreshRef } from "./hooks/use-fresh-ref";
import {
  isComposerFormActionResponse,
  mergeSearchParamsToUrl,
  tryCall,
  tryCallAsync,
} from "./helpers";
import {
  ComposerActionUnexpectedResponseError,
  ComposerActionUserRejectedRequestError,
} from "./errors";
import type {
  EthSendTransactionAction,
  EthSignTypedDataV4Action,
  MiniAppMessage,
  MiniAppResponse,
} from "./mini-app-messages";
import { miniAppMessageSchema } from "./mini-app-messages";
import type { FarcasterSigner } from "./identity/farcaster";

export type { MiniAppMessage, MiniAppResponse };

type FetchComposerActionFunctionArg = {
  actionState: ComposerActionState;
  proxyUrl: string;
  signer: FarcasterSigner | null;
  url: string;
};

type FetchComposerActionFunction = (
  arg: FetchComposerActionFunctionArg
) => Promise<void>;

export type RegisterMessageListener = (
  formResponse: ComposerActionFormResponse,
  messageListener: MiniAppMessageListener
) => () => void;

type MiniAppMessageListener = (message: MiniAppMessage) => Promise<void>;

export type OnTransactionFunctionResult = {
  hash: `0x${string}`;
  address: `0x${string}`;
};

export type OnTransactionFunction = (arg: {
  action: EthSendTransactionAction;
  address: `0x${string}`;
}) => Promise<OnTransactionFunctionResult | null>;

export type OnSignatureFunctionResult = {
  hash: `0x${string}`;
  address: `0x${string}`;
};

export type OnSignatureFunction = (arg: {
  action: EthSignTypedDataV4Action;
  address: `0x${string}`;
}) => Promise<OnSignatureFunctionResult | null>;

export type OnCreateCastFunction = (arg: {
  cast: ComposerActionState;
}) => Promise<void>;

export type ResolveAddressFunction = () => Promise<`0x${string}` | null>;

export type OnPostMessageToTargetFunction = (
  response: MiniAppResponse,
  form: ComposerActionFormResponse
) => unknown;

export type UseComposerActionOptions = {
  /**
   * Current action state, value should be memoized. It doesn't cause composer action / mini app to refetch.
   */
  actionState: ComposerActionState;
  /**
   * URL to composer action / mini app server
   *
   * If value changes it will refetch the composer action / mini app
   */
  url: string;
  /**
   * Signer used to sign the composer action.
   *
   * If value changes it will refetch the composer action / mini app
   */
  signer: FarcasterSignerState<any>;
  /**
   * URL to the action proxy server. If value changes composer action / mini app will be refetched.
   *
   * Proxy must handle POST requests.
   */
  proxyUrl: string;
  /**
   * If enabled if will fetch the composer action / mini app on mount.
   *
   * @defaultValue true
   */
  enabled?: boolean;
  /**
   * Called before onTransaction/onSignature is invoked to obtain an address to use.
   *
   * If the function returns null onTransaction/onSignature will not be called.
   */
  resolveAddress: ResolveAddressFunction;
  onError?: (error: Error) => void;
  onCreateCast: OnCreateCastFunction;
  onTransaction: OnTransactionFunction;
  onSignature: OnSignatureFunction;
  /**
   * Called when a response to a message is sent to target (e.g. iframe).
   */
  onPostResponseToTarget: OnPostMessageToTargetFunction;
  /**
   * Allows to override how the message listener is registered. Function must return a function that removes the listener.
   *
   * Changes in the value aren't reflected so it's recommended to use a memoized function.
   *
   * By default it uses window.addEventListener("message", ...)
   */
  registerMessageListener?: RegisterMessageListener;
};

type UseComposerActionResult = {
  refetch: () => Promise<void>;
} & (
  | {
      status: "idle";
      data: undefined;
      error: undefined;
    }
  | {
      status: "loading";
      data: undefined;
      error: undefined;
    }
  | {
      status: "error";
      data: undefined;
      error: Error;
    }
  | {
      status: "success";
      data: ComposerActionFormResponse;
      error: undefined;
    }
);

export function useComposerAction({
  actionState,
  enabled = true,
  proxyUrl,
  signer,
  url,
  onError,
  onCreateCast,
  onSignature,
  onTransaction,
  resolveAddress,
  registerMessageListener = defaultRegisterMessageListener,
  onPostResponseToTarget,
}: UseComposerActionOptions): UseComposerActionResult {
  const onErrorRef = useFreshRef(onError);
  const [state, dispatch] = useReducer(composerActionReducer, {
    status: "idle",
    enabled,
  });
  const registerMessageListenerRef = useFreshRef(registerMessageListener);
  const actionStateRef = useFreshRef(actionState);
  const onCreateCastRef = useFreshRef(onCreateCast);
  const onPostResponseToTargetRef = useFreshRef(onPostResponseToTarget);
  const onTransactionRef = useFreshRef(onTransaction);
  const onSignatureRef = useFreshRef(onSignature);
  const resolveAddressRef = useFreshRef(resolveAddress);
  const lastFetchActionArgRef = useRef<FetchComposerActionFunctionArg | null>(
    null
  );
  const signerRef = useFreshRef(signer);

  const messageListener = useCallback(
    async (
      successState: Extract<ComposerActionReducerState, { status: "success" }>,
      message: MiniAppMessage
    ) => {
      if ("type" in message || message.method === "fc_createCast") {
        const cast =
          "type" in message ? message.data.cast : message.params.cast;

        const resultOrError = await tryCallAsync(() =>
          onCreateCastRef.current({
            cast,
          })
        );

        if (resultOrError instanceof Error) {
          onPostResponseToTargetRef.current(
            {
              jsonrpc: "2.0",
              id: "method" in message ? message.id : null,
              error: {
                code: -32000,
                message: resultOrError.message,
              },
            },
            successState.response
          );
        }

        onPostResponseToTargetRef.current(
          {
            jsonrpc: "2.0",
            id: "method" in message ? message.id : null,
            result: {
              success: true,
            },
          },
          successState.response
        );
      } else if (message.method === "fc_requestWalletAction") {
        const addressOrError = await tryCallAsync(() =>
          resolveAddressRef.current()
        );

        if (addressOrError instanceof Error) {
          tryCall(() => onErrorRef.current?.(addressOrError));

          onPostResponseToTargetRef.current(
            {
              jsonrpc: "2.0",
              id: message.id,
              error: {
                code: -32000,
                message: addressOrError.message,
              },
            },
            successState.response
          );

          return;
        }

        if (!addressOrError) {
          return;
        }

        if (message.params.action.method === "eth_sendTransaction") {
          const action = message.params.action;

          const resultOrError = await tryCallAsync(() =>
            onTransactionRef.current({
              action,
              address: addressOrError,
            })
          );

          if (resultOrError instanceof Error) {
            tryCall(() => onErrorRef.current?.(resultOrError));

            onPostResponseToTargetRef.current(
              {
                jsonrpc: "2.0",
                id: message.id,
                error: {
                  code: -32000,
                  message: resultOrError.message,
                },
              },
              successState.response
            );

            return;
          }

          if (!resultOrError) {
            const error = new ComposerActionUserRejectedRequestError();

            tryCall(() => onErrorRef.current?.(error));

            onPostResponseToTargetRef.current(
              {
                jsonrpc: "2.0",
                id: message.id,
                error: {
                  code: -32000,
                  message: error.message,
                },
              },
              successState.response
            );
            return;
          }

          onPostResponseToTargetRef.current(
            {
              jsonrpc: "2.0",
              id: message.id,
              result: {
                address: resultOrError.address,
                transactionHash: resultOrError.hash,
              },
            },
            successState.response
          );
        } else if (message.params.action.method === "eth_signTypedData_v4") {
          const action = message.params.action;

          const resultOrError = await tryCallAsync(() =>
            onSignatureRef.current({
              action,
              address: addressOrError,
            })
          );

          if (resultOrError instanceof Error) {
            tryCall(() => onErrorRef.current?.(resultOrError));

            onPostResponseToTargetRef.current(
              {
                jsonrpc: "2.0",
                id: message.id,
                error: {
                  code: -32000,
                  message: resultOrError.message,
                },
              },
              successState.response
            );

            return;
          }

          if (!resultOrError) {
            const error = new ComposerActionUserRejectedRequestError();

            tryCall(() => onErrorRef.current?.(error));

            onPostResponseToTargetRef.current(
              {
                jsonrpc: "2.0",
                id: message.id,
                error: {
                  code: -32000,
                  message: error.message,
                },
              },
              successState.response
            );

            return;
          }

          onPostResponseToTargetRef.current(
            {
              jsonrpc: "2.0",
              id: message.id,
              result: {
                address: resultOrError.address,
                signature: resultOrError.hash,
              },
            },
            successState.response
          );
        } else {
          tryCall(() =>
            onErrorRef.current?.(
              new Error(
                `Unknown fc_requestWalletAction action method: ${message.params.action.method}`
              )
            )
          );
        }
      } else {
        tryCall(() => onErrorRef.current?.(new Error("Unknown message")));
      }
    },
    [
      onCreateCastRef,
      onErrorRef,
      onPostResponseToTargetRef,
      onSignatureRef,
      onTransactionRef,
      resolveAddressRef,
    ]
  );

  const fetchAction = useCallback<FetchComposerActionFunction>(
    async (arg) => {
      const currentSigner = arg.signer;

      if (
        currentSigner?.status !== "approved" &&
        currentSigner?.status !== "impersonating"
      ) {
        await signerRef.current.onSignerlessFramePress();
        return;
      }

      dispatch({ type: "loading-url" });

      const signedDataOrError = await tryCallAsync(() =>
        signerRef.current.signComposerAction(currentSigner.privateKey, {
          url: arg.url,
          state: arg.actionState,
          fid: currentSigner.fid,
        })
      );

      if (signedDataOrError instanceof Error) {
        tryCall(() => onErrorRef.current?.(signedDataOrError));
        dispatch({ type: "error", error: signedDataOrError });

        return;
      }

      const proxiedUrl = mergeSearchParamsToUrl(
        arg.proxyUrl,
        new URLSearchParams({ postUrl: arg.url })
      );

      const actionResponseOrError = await tryCallAsync(() =>
        fetch(proxiedUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(signedDataOrError),
          cache: "no-cache",
        })
      );

      if (actionResponseOrError instanceof Error) {
        tryCall(() => onErrorRef.current?.(actionResponseOrError));
        dispatch({ type: "error", error: actionResponseOrError });

        return;
      }

      if (!actionResponseOrError.ok) {
        const error = new Error(
          `Unexpected response status ${actionResponseOrError.status}`
        );

        tryCall(() => onErrorRef.current?.(error));
        dispatch({ type: "error", error });

        return;
      }

      const actionResponseDataOrError = await tryCallAsync(
        () => actionResponseOrError.clone().json() as Promise<unknown>
      );

      if (actionResponseDataOrError instanceof Error) {
        tryCall(() => onErrorRef.current?.(actionResponseDataOrError));
        dispatch({ type: "error", error: actionResponseDataOrError });

        return;
      }

      if (!isComposerFormActionResponse(actionResponseDataOrError)) {
        const error = new ComposerActionUnexpectedResponseError();
        tryCall(() => onErrorRef.current?.(error));
        dispatch({ type: "error", error });

        return;
      }

      dispatch({ type: "done", response: actionResponseDataOrError });
    },
    [onErrorRef, signerRef]
  );

  const stateRef = useFreshRef(state);
  const refetch = useCallback(() => {
    if (!stateRef.current.enabled || !lastFetchActionArgRef.current) {
      return Promise.resolve();
    }

    return fetchAction(lastFetchActionArgRef.current);
  }, [fetchAction, stateRef]);

  useEffect(() => {
    dispatch({ type: "enabled-change", enabled });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    lastFetchActionArgRef.current = {
      actionState: actionStateRef.current,
      signer: signer.signer as unknown as FarcasterSigner | null,
      url,
      proxyUrl,
    };

    fetchAction(lastFetchActionArgRef.current).catch((e) => {
      onErrorRef.current?.(e instanceof Error ? e : new Error(String(e)));
    });
  }, [
    url,
    proxyUrl,
    signer.signer,
    enabled,
    fetchAction,
    actionStateRef,
    onErrorRef,
  ]);

  // register message listener when state changes to success
  useEffect(() => {
    if (state.status === "success") {
      return registerMessageListenerRef.current(
        state.response,
        messageListener.bind(null, state)
      );
    }
  }, [messageListener, registerMessageListenerRef, state]);

  return useMemo(() => {
    switch (state.status) {
      case "idle":
        return {
          status: "idle",
          data: undefined,
          error: undefined,
          refetch,
        };
      case "loading":
        return {
          status: "loading",
          data: undefined,
          error: undefined,
          refetch,
        };
      case "error":
        return {
          status: "error",
          data: undefined,
          error: state.error,
          refetch,
        };
      default:
        return {
          status: "success",
          data: state.response,
          error: undefined,
          refetch,
        };
    }
  }, [state, refetch]);
}

export { miniAppMessageSchema };

/**
 * Default function used to register message listener. Works in browsers only.
 */
export const defaultRegisterMessageListener: RegisterMessageListener =
  function defaultRegisterMessageListener(formResponse, messageListener) {
    if (typeof window === "undefined") {
      // eslint-disable-next-line no-console -- provide feedback
      console.warn(
        "@frames.js/render: You are using default registerMessageListener in an environment without window object"
      );

      return () => {
        // noop
      };
    }

    const miniAppOrigin = new URL(formResponse.url).origin;

    const messageParserListener = (event: MessageEvent): void => {
      // make sure that we only listen to messages from the mini app
      if (event.origin !== miniAppOrigin) {
        return;
      }

      const result = miniAppMessageSchema.safeParse(event.data);

      if (!result.success) {
        // eslint-disable-next-line no-console -- provide feedback
        console.warn(
          "@frames.js/render: Invalid message received",
          event.data,
          result.error
        );
        return;
      }

      const message = result.data;

      messageListener(message).catch((e) => {
        // eslint-disable-next-line no-console -- provide feedback
        console.error(`@frames.js/render:`, e);
      });
    };

    window.addEventListener("message", messageParserListener);

    return () => {
      window.removeEventListener("message", messageParserListener);
    };
  };

type SharedComposerActionReducerState = {
  enabled: boolean;
};

type ComposerActionReducerState = SharedComposerActionReducerState &
  (
    | {
        status: "idle";
      }
    | {
        status: "loading";
      }
    | {
        status: "error";
        error: Error;
      }
    | {
        status: "success";
        response: ComposerActionFormResponse;
      }
  );

type ComposerActionReducerAction =
  | {
      type: "loading-url";
    }
  | {
      type: "error";
      error: Error;
    }
  | {
      type: "done";
      response: ComposerActionFormResponse;
    }
  | {
      type: "enabled-change";
      enabled: boolean;
    };

function composerActionReducer(
  state: ComposerActionReducerState,
  action: ComposerActionReducerAction
): ComposerActionReducerState {
  if (action.type === "enabled-change") {
    if (action.enabled) {
      return {
        ...state,
        enabled: true,
      };
    }

    return {
      status: "idle",
      enabled: false,
    };
  }

  if (!state.enabled) {
    return state;
  }

  switch (action.type) {
    case "done":
      return {
        ...state,
        status: "success",
        response: action.response,
      };
    case "loading-url":
      return {
        ...state,
        status: "loading",
      };
    case "error":
      return {
        ...state,
        status: "error",
        error: action.error,
      };
    default:
      return state;
  }
}
