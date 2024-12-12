import type {
  CastActionFrameResponse,
  CastActionMessageResponse,
} from "frames.js/types";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { ParseFramesWithReportsResult } from "frames.js/frame-parsers";
import { useFreshRef } from "./hooks/use-fresh-ref";
import type { FarcasterSigner } from "./identity/farcaster";
import type { FarcasterSignerState } from "./farcaster";
import {
  isCastActionFrameResponse,
  isCastActionMessageResponse,
  isParseFramesWithReportsResult,
  mergeSearchParamsToUrl,
  tryCall,
  tryCallAsync,
} from "./helpers";
import { CastActionUnexpectedResponseError } from "./errors";
import type { OnErrorFunction } from "./unstable-types";

type CastID = {
  fid: number;
  hash: `0x${string}`;
};

type FetchCastActionFunctionArg = {
  proxyUrl: string;
  signer: FarcasterSigner | null;
  /**
   * Cast action postUrl
   */
  postUrl: string;
  /**
   * The id of the cast from which the user initiated the action
   */
  castId: CastID;
};

type FetchCastActionFunction = (
  arg: FetchCastActionFunctionArg
) => Promise<void>;

export type UseCastActionOptions = {
  /**
   * The id of the cast from which the user initiated the action
   *
   * If value changes it will refetch the cast action
   */
  castId: CastID;
  /**
   * Post URL of the action handler
   *
   * If value changes it will refetch the cast action.
   */
  postUrl: string;
  /**
   * URL to the action proxy server. If value changes cast action will be refetched.
   *
   * Proxy must handle POST requests.
   */
  proxyUrl: string;
  /**
   * Signer used to sign the cast action.
   *
   * If value changes it will refetch the cast action.
   */
  signer: FarcasterSignerState<any>;
  /**
   * If enabled it will fetch the cast action on mount.
   *
   * @defaultValue true
   */
  enabled?: boolean;
  /**
   * Custom fetch function to fetch cast action.
   */
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
  onError?: OnErrorFunction;
  /**
   * Called when the response is a CastActionMessageResponse.
   */
  onMessageResponse?: (response: CastActionMessageResponse) => void;
  /**
   * Called when the response is a CastActionFrameResponse.
   */
  onFrameResponse?: (response: CastActionFrameResponse) => void;
  /**
   * Called when the response is successful but it's not a valid cast action response.
   */
  onInvalidResponse?: (response: unknown) => void;
};

type UseCastActionResult = {
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
      type: "frame";
      data: CastActionFrameResponse;
      frame: ParseFramesWithReportsResult;
      error: undefined;
    }
  | {
      status: "success";
      type: "message";
      data: CastActionMessageResponse;
      error: undefined;
    }
);

export function useCastAction({
  castId,
  enabled = true,
  fetch: fetchFunction = defaultFetchFn,
  onError,
  proxyUrl,
  signer,
  postUrl,
  onFrameResponse,
  onMessageResponse,
  onInvalidResponse,
}: UseCastActionOptions): UseCastActionResult {
  const onErrorRef = useFreshRef(onError);
  const fetchRef = useFreshRef(fetchFunction);
  const onFrameResponseRef = useFreshRef(onFrameResponse);
  const onMessageResponseRef = useFreshRef(onMessageResponse);
  const onInvalidResponseRef = useFreshRef(onInvalidResponse);
  const signerRef = useFreshRef(signer);
  const lastFetchActionArgRef = useRef<FetchCastActionFunctionArg | null>(null);
  const [state, dispatch] = useReducer(castActionReducer, {
    status: "idle",
    enabled,
  });
  const castIdRef = useFreshRef(castId);

  const fetchAction = useCallback<FetchCastActionFunction>(
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
        signerRef.current.signCastAction(currentSigner.privateKey, {
          postUrl: arg.postUrl,
          fid: currentSigner.fid,
          castId: arg.castId,
        })
      );

      if (signedDataOrError instanceof Error) {
        tryCall(() => onErrorRef.current?.(signedDataOrError));
        dispatch({ type: "error", error: signedDataOrError });

        return;
      }

      const proxiedUrl = mergeSearchParamsToUrl(
        arg.proxyUrl,
        new URLSearchParams({ postUrl: arg.postUrl })
      );

      const actionResponseOrError = await tryCallAsync(() =>
        fetchRef.current(proxiedUrl, {
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

      if (isCastActionFrameResponse(actionResponseDataOrError)) {
        tryCall(() => onFrameResponseRef.current?.(actionResponseDataOrError));

        const signedFrameDataOrError = await tryCallAsync(() => {
          return signerRef.current.signFrameAction({
            buttonIndex: 1,
            frameButton: {
              action: "post",
              label: "cast action",
              post_url: actionResponseDataOrError.frameUrl,
              target: actionResponseDataOrError.frameUrl,
            },
            frameContext: {
              castId: castIdRef.current,
            },
            signer: currentSigner,
            url: actionResponseDataOrError.frameUrl,
            type: "default",
          });
        });

        if (signedFrameDataOrError instanceof Error) {
          tryCall(() => onErrorRef.current?.(signedFrameDataOrError));
          dispatch({ type: "error", error: signedFrameDataOrError });

          return;
        }

        const proxiedFrameUrl = mergeSearchParamsToUrl(
          arg.proxyUrl,
          signedFrameDataOrError.searchParams,
          new URLSearchParams({
            multispecification: "true",
            postUrl: actionResponseDataOrError.frameUrl,
          })
        );

        const frameResponseOrError = await tryCallAsync(() => {
          return fetchRef.current(proxiedFrameUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(signedFrameDataOrError.body),
            cache: "no-cache",
          });
        });

        if (frameResponseOrError instanceof Error) {
          tryCall(() => onErrorRef.current?.(frameResponseOrError));
          dispatch({ type: "error", error: frameResponseOrError });

          return;
        }

        if (!frameResponseOrError.ok) {
          const error = new Error(
            `Unexpected response status ${frameResponseOrError.status}`
          );

          tryCall(() => onErrorRef.current?.(error));
          dispatch({ type: "error", error });

          return;
        }

        const frameResponseDataOrError = await tryCallAsync(
          () => frameResponseOrError.clone().json() as Promise<unknown>
        );

        if (frameResponseDataOrError instanceof Error) {
          tryCall(() => onErrorRef.current?.(frameResponseDataOrError));
          dispatch({ type: "error", error: frameResponseDataOrError });

          return;
        }

        if (!isParseFramesWithReportsResult(frameResponseDataOrError)) {
          const error = new Error("Invalid frame response");

          tryCall(() => onErrorRef.current?.(error));
          dispatch({ type: "error", error });

          return;
        }

        dispatch({
          type: "frame",
          response: actionResponseDataOrError,
          frame: frameResponseDataOrError,
        });

        return;
      }

      if (isCastActionMessageResponse(actionResponseDataOrError)) {
        tryCall(() =>
          onMessageResponseRef.current?.(actionResponseDataOrError)
        );

        dispatch({
          type: "message",
          response: actionResponseDataOrError,
        });

        return;
      }

      tryCall(() => onInvalidResponseRef.current?.(actionResponseDataOrError));

      const error = new CastActionUnexpectedResponseError();
      tryCall(() => onErrorRef.current?.(error));

      dispatch({ type: "error", error });
    },
    [
      castIdRef,
      fetchRef,
      onErrorRef,
      onFrameResponseRef,
      onInvalidResponseRef,
      onMessageResponseRef,
      signerRef,
    ]
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
    if (!enabled || !postUrl) {
      return;
    }

    lastFetchActionArgRef.current = {
      signer: signer.signer as unknown as FarcasterSigner | null,
      postUrl,
      proxyUrl,
      castId,
    };

    fetchAction(lastFetchActionArgRef.current).catch((e) => {
      onErrorRef.current?.(e instanceof Error ? e : new Error(String(e)));
    });
  }, [
    castId,
    postUrl,
    proxyUrl,
    signer.signer,
    enabled,
    fetchAction,
    onErrorRef,
  ]);

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
      default: {
        if (state.type === "frame") {
          return {
            status: "success",
            type: "frame",
            data: state.response,
            frame: state.frame,
            error: undefined,
            refetch,
          };
        }

        return {
          status: "success",
          type: "message",
          data: state.response,
          error: undefined,
          refetch,
        };
      }
    }
  }, [state, refetch]);
}

function defaultFetchFn(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, init);
}

type SharedCastActionReducerState = {
  enabled: boolean;
};

type CastActionReducerState = SharedCastActionReducerState &
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
        type: "frame";
        response: CastActionFrameResponse;
        frame: ParseFramesWithReportsResult;
      }
    | {
        status: "success";
        type: "message";
        response: CastActionMessageResponse;
      }
  );

type CastActionReducerAction =
  | {
      type: "loading-url";
    }
  | {
      type: "error";
      error: Error;
    }
  | {
      type: "frame";
      response: CastActionFrameResponse;
      frame: ParseFramesWithReportsResult;
    }
  | {
      type: "message";
      response: CastActionMessageResponse;
    }
  | {
      type: "enabled-change";
      enabled: boolean;
    };

function castActionReducer(
  state: CastActionReducerState,
  action: CastActionReducerAction
): CastActionReducerState {
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
    case "frame":
      return {
        ...state,
        status: "success",
        type: "frame",
        response: action.response,
        frame: action.frame,
      };
    case "message":
      return {
        ...state,
        status: "success",
        type: "message",
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
