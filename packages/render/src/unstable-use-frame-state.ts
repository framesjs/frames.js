import type { MutableRefObject } from "react";
import { useMemo, useReducer, useRef } from "react";
import type {
  ParseFramesWithReportsResult,
  ParseResultWithFrameworkDetails,
  SupportedParsingSpecification,
} from "frames.js/frame-parsers";
import type { FrameContext, SignerStateInstance } from "./types";
import type {
  FrameReducerActions,
  FrameStackGetPending,
  FrameStackPostPending,
  FrameState,
  FrameStateAPI,
  ResolveSignerFunction,
  UseFrameStateOptions,
  UseFrameStateReturn,
} from "./unstable-types";
import { useFreshRef } from "./hooks/use-fresh-ref";

function resolveParseResultForSpecification(
  parseResult: ParseFramesWithReportsResult,
  specification: SupportedParsingSpecification | SupportedParsingSpecification[]
): ParseResultWithFrameworkDetails {
  const specifications = Array.isArray(specification)
    ? specification
    : [specification];

  if (specifications.length === 0) {
    throw new Error("Signer does not have any specification defined");
  }

  // take first valid specification or return first one
  let frameResult: ParseResultWithFrameworkDetails | undefined;

  for (const currentSpecification of specifications) {
    // take first valid specification
    if (parseResult[currentSpecification].status === "success") {
      frameResult = parseResult[currentSpecification];
      break;
    }

    // or take first one
    if (!frameResult) {
      frameResult = parseResult[currentSpecification];
    }
  }

  if (!frameResult) {
    throw new Error("No frame for the given specification");
  }

  return frameResult;
}

function createFramesStackReducer<
  TExtraPending = unknown,
  TExtraDone = unknown,
  TExtraDoneRedirect = unknown,
  TExtraRequestError = unknown,
  TExtraMesssage = unknown,
>(resolveSignerRef: MutableRefObject<ResolveSignerFunction>) {
  return function framesStackReducer(
    state: FrameState<
      TExtraPending,
      TExtraDone,
      TExtraDoneRedirect,
      TExtraRequestError,
      TExtraMesssage
    >,
    action: FrameReducerActions<
      TExtraPending,
      TExtraDone,
      TExtraDoneRedirect,
      TExtraRequestError,
      TExtraMesssage
    >
  ): FrameState<
    TExtraPending,
    TExtraDone,
    TExtraDoneRedirect,
    TExtraRequestError,
    TExtraMesssage
  > {
    switch (action.action) {
      case "LOAD":
        return {
          ...state,
          stack: [action.item, ...state.stack],
        };
      case "DONE_REDIRECT": {
        const index = state.stack.findIndex(
          (item) => item.id === action.pendingItem.id
        );

        if (index === -1) {
          return state;
        }

        state.stack[index] = {
          ...action.pendingItem,
          ...action.item,
          status: "doneRedirect",
        };

        return {
          ...state,
          stack: state.stack.slice(),
        };
      }
      case "DONE_WITH_ERROR_MESSAGE": {
        const index = state.stack.findIndex(
          (item) => item.id === action.pendingItem.id
        );

        if (index === -1) {
          return state;
        }

        state.stack[index] = {
          ...action.pendingItem,
          ...action.item,
        };

        return {
          ...state,
          stack: state.stack.slice(),
        };
      }
      case "DONE": {
        const index = state.stack.findIndex(
          (item) => item.id === action.pendingItem.id
        );

        if (index === -1) {
          return state;
        }

        let signerState: SignerStateInstance<any, any, any>;
        let specification:
          | SupportedParsingSpecification
          | SupportedParsingSpecification[];
        let frameContext: FrameContext;
        let homeframeUrl: string;
        let parseResult = action.parseResult;

        if (state.type === "not-initialized") {
          /**
           * This is a response for initial request in the stack. We don't care if the request was GET or POST
           * because we care only about initializing on initial request.
           *
           * It can be POST if you have a frame cast action response. Then we load the frame by sending a POST request.
           */
          const resolvedSigner = resolveSignerRef.current({
            parseResult: action.parseResult,
          });

          ({ signerState, frameContext = {} } = resolvedSigner);
          homeframeUrl = action.pendingItem.url;
          specification = signerState.specification;
        } else {
          ({
            signerState,
            specification,
            frameContext,
            homeframeUrl,
            parseResult,
          } = state);
        }

        const frameResult = resolveParseResultForSpecification(
          action.parseResult,
          specification
        );

        state.stack[index] = {
          ...action.pendingItem,
          status: "done",
          frameResult,
          extra: action.extra,
        };

        return {
          ...state,
          parseResult,
          signerState,
          frameContext,
          homeframeUrl,
          specification: frameResult.specification,
          type: "initialized",
          stack: state.stack.slice(),
        };
      }
      case "REQUEST_ERROR": {
        const index = state.stack.findIndex(
          (item) => item.id === action.pendingItem.id
        );

        if (index === -1) {
          return state;
        }

        state.stack[index] = action.item;

        return {
          ...state,
          stack: state.stack.slice(),
        };
      }
      case "RESET": {
        if (state.type === "not-initialized") {
          return state;
        }

        const { frameContext = {}, signerState } = resolveSignerRef.current({
          parseResult: state.parseResult,
        });

        const frameResult = resolveParseResultForSpecification(
          state.parseResult,
          signerState.specification
        );

        const stackItem = state.stack[0];

        if (stackItem?.status === "done") {
          stackItem.frameResult = frameResult;
        }

        return {
          ...state,
          stack: stackItem ? [{ ...stackItem }] : [],
          type: "initialized",
          frameContext,
          signerState,
          specification: frameResult.specification,
        };
      }
      case "RESET_INITIAL_FRAME": {
        const { frameContext = {}, signerState } = resolveSignerRef.current({
          parseResult: action.parseResult,
        });
        const frameResult = resolveParseResultForSpecification(
          action.parseResult,
          signerState.specification
        );

        return {
          type: "initialized",
          signerState,
          frameContext,
          specification: frameResult.specification,
          homeframeUrl: action.homeframeUrl,
          parseResult: action.parseResult,
          stack: [
            {
              request: {
                method: "GET",
                url: action.homeframeUrl,
              },
              url: action.homeframeUrl,
              id: Date.now(),
              frameResult,
              status: "done",
              extra: action.extra,
            },
          ],
        };
      }
      case "CLEAR":
        return {
          type: "not-initialized",
          stack: [],
        };
      default:
        return state;
    }
  };
}

export function useFrameState<
  TExtraPending = unknown,
  TExtraDone = unknown,
  TExtraDoneRedirect = unknown,
  TExtraRequestError = unknown,
  TExtraMesssage = unknown,
>({
  initialParseResult,
  initialFrameUrl,
  initialPendingExtra,
  resolveSpecification,
  resolveGETPendingExtra,
  resolvePOSTPendingExtra,
  resolveDoneExtra,
  resolveDoneRedirectExtra,
  resolveDoneWithErrorMessageExtra,
  resolveFailedExtra,
  resolveFailedWithRequestErrorExtra,
}: UseFrameStateOptions<
  TExtraPending,
  TExtraDone,
  TExtraDoneRedirect,
  TExtraRequestError,
  TExtraMesssage
>): UseFrameStateReturn<
  TExtraPending,
  TExtraDone,
  TExtraDoneRedirect,
  TExtraRequestError,
  TExtraMesssage
> {
  const idCounterRef = useRef(0);
  const resolveSpecificationRef = useFreshRef(resolveSpecification);
  const resolveGETPendingExtraRef = useFreshRef(resolveGETPendingExtra);
  const resolvePOSTPendingExtraRef = useFreshRef(resolvePOSTPendingExtra);
  const resolveDoneExtraRef = useFreshRef(resolveDoneExtra);
  const resolveDoneRedirectExtraRef = useFreshRef(resolveDoneRedirectExtra);
  const resolveDoneWithErrorMessageExtraRef = useFreshRef(
    resolveDoneWithErrorMessageExtra
  );
  const resolveFailedExtraRef = useFreshRef(resolveFailedExtra);
  const resolveFailedWithRequestErrorExtraRef = useFreshRef(
    resolveFailedWithRequestErrorExtra
  );
  const reducerRef = useRef(
    createFramesStackReducer<
      TExtraPending,
      TExtraDone,
      TExtraDoneRedirect,
      TExtraRequestError,
      TExtraMesssage
    >(resolveSpecificationRef)
  );
  const initialPendingExtraRef = useFreshRef(initialPendingExtra);
  const [state, dispatch] = useReducer(
    reducerRef.current,
    [initialParseResult, initialFrameUrl, initialPendingExtra] as const,
    ([parseResult, frameUrl, extra]): FrameState<
      TExtraPending,
      TExtraDone,
      TExtraDoneRedirect,
      TExtraRequestError,
      TExtraMesssage
    > => {
      if (parseResult && frameUrl) {
        const { frameContext = {}, signerState } = resolveSpecification({
          parseResult,
        });

        const frameResult = resolveParseResultForSpecification(
          parseResult,
          signerState.specification
        );

        return {
          type: "initialized",
          frameContext,
          signerState,
          specification: frameResult.specification,
          homeframeUrl: frameUrl,
          parseResult,
          stack: [
            {
              id: idCounterRef.current++,
              request: {
                method: "GET",
                url: frameUrl,
              },
              frameResult,
              status: "done",
              url: frameUrl,
              extra: (extra ?? {}) as TExtraDone,
            },
          ],
        };
      }

      return {
        type: "not-initialized",
        stack: frameUrl
          ? [
              // prevent flash of empty content by adding pending item because initial frame is being loaded
              {
                id: idCounterRef.current++,
                method: "GET",
                request: {
                  method: "GET",
                  url: frameUrl,
                },
                url: frameUrl,
                status: "pending",
                extra: (extra ?? {}) as TExtraPending,
              },
            ]
          : [],
      };
    }
  );

  const api: FrameStateAPI<
    TExtraPending,
    TExtraDone,
    TExtraDoneRedirect,
    TExtraRequestError,
    TExtraMesssage
  > = useMemo(() => {
    return {
      dispatch,
      clear() {
        dispatch({
          action: "CLEAR",
        });
      },
      createGetPendingItem(arg) {
        const item: FrameStackGetPending<TExtraPending> = {
          id: idCounterRef.current++,
          method: "GET",
          request: arg.request,
          url: arg.request.url,
          status: "pending",
          extra:
            resolveGETPendingExtraRef.current?.(arg) ?? ({} as TExtraPending),
        };

        dispatch({
          action: "LOAD",
          item,
        });

        return item;
      },
      createPostPendingItem(arg) {
        const item: FrameStackPostPending<TExtraPending> = {
          id: idCounterRef.current++,
          method: "POST",
          request: arg.request,
          url: arg.action.searchParams.get("postUrl") ?? "missing postUrl",
          status: "pending",
          extra:
            resolvePOSTPendingExtraRef.current?.(arg) ?? ({} as TExtraPending),
        };

        dispatch({
          action: "LOAD",
          item,
        });

        return item;
      },
      markAsDone(arg) {
        dispatch({
          action: "DONE",
          pendingItem: arg.pendingItem,
          parseResult: arg.parseResult,
          extra: resolveDoneExtraRef.current?.(arg) ?? ({} as TExtraDone),
        });
      },
      markAsDoneWithErrorMessage(arg) {
        dispatch({
          action: "DONE_WITH_ERROR_MESSAGE",
          pendingItem: arg.pendingItem,
          item: {
            ...arg.pendingItem,
            status: "message",
            type: "error",
            message: arg.responseData.message,
            extra:
              resolveDoneWithErrorMessageExtraRef.current?.(arg) ??
              ({} as TExtraMesssage),
          },
        });
      },
      markAsDoneWithRedirect(arg) {
        dispatch({
          action: "DONE_REDIRECT",
          pendingItem: arg.pendingItem,
          item: {
            ...arg.pendingItem,
            location: arg.location,
            status: "doneRedirect",
            extra:
              resolveDoneRedirectExtraRef.current?.(arg) ??
              ({} as TExtraDoneRedirect),
          },
        });
      },
      markAsFailed(arg) {
        dispatch({
          action: "REQUEST_ERROR",
          pendingItem: arg.pendingItem,
          item: {
            request: arg.pendingItem.request,
            id: arg.pendingItem.id,
            url: arg.pendingItem.url,
            requestError: arg.requestError,
            status: "requestError",
            extra:
              resolveFailedExtraRef.current?.(arg) ??
              ({} as TExtraRequestError),
          },
        });
      },
      markAsFailedWithRequestError(arg) {
        dispatch({
          action: "REQUEST_ERROR",
          pendingItem: arg.pendingItem,
          item: {
            ...arg.pendingItem,
            status: "requestError",
            requestError: arg.error,
            extra:
              resolveFailedWithRequestErrorExtraRef.current?.(arg) ??
              ({} as TExtraRequestError),
          },
        });
      },
      reset(arg) {
        if (!arg) {
          dispatch({ action: "RESET" });
        } else {
          dispatch({
            action: "RESET_INITIAL_FRAME",
            homeframeUrl: arg.homeframeUrl,
            parseResult: arg.parseResult,
            extra: (initialPendingExtraRef.current ?? {}) as TExtraDone,
          });
        }
      },
    };
  }, [
    initialPendingExtraRef,
    resolveDoneExtraRef,
    resolveDoneRedirectExtraRef,
    resolveDoneWithErrorMessageExtraRef,
    resolveFailedExtraRef,
    resolveFailedWithRequestErrorExtraRef,
    resolveGETPendingExtraRef,
    resolvePOSTPendingExtraRef,
  ]);

  return [state, api];
}
