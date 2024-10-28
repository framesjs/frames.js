import type { MutableRefObject } from "react";
import { useMemo, useReducer, useRef } from "react";
import type {
  ParseFramesWithReportsResult,
  SupportedParsingSpecification,
} from "frames.js/frame-parsers";
import type { ErrorMessageResponse } from "frames.js/types";
import type {
  FrameContext,
  FrameGETRequest,
  FramePOSTRequest,
  FrameStackGetPending,
  FrameStackPostPending,
  SignedFrameAction,
  SignerStateActionContext,
  SignerStateInstance,
} from "./types";
import type {
  FrameReducerActions,
  FramesStack,
  ResolveSignerFunction,
} from "./unstable-types";
import { useFreshRef } from "./hooks/use-fresh-ref";

function computeDurationInSeconds(start: Date, end: Date): number {
  return Number(((end.getTime() - start.getTime()) / 1000).toFixed(2));
}

export type FrameState =
  | {
      type: "initialized";
      stack: FramesStack;
      signerState: SignerStateInstance;
      frameContext: FrameContext;
      specification: SupportedParsingSpecification;
      homeframeUrl: string;
      parseResult: ParseFramesWithReportsResult;
    }
  | {
      type: "not-initialized";
      stack: FramesStack;
    };

function createFramesStackReducer(
  resolveSignerRef: MutableRefObject<ResolveSignerFunction>
) {
  return function framesStackReducer(
    state: FrameState,
    action: FrameReducerActions
  ): FrameState {
    switch (action.action) {
      case "LOAD":
        return {
          ...state,
          stack: [action.item, ...state.stack],
        };
      case "DONE_REDIRECT": {
        const index = state.stack.findIndex(
          (item) => item.timestamp === action.pendingItem.timestamp
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
          (item) => item.timestamp === action.pendingItem.timestamp
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
          (item) => item.timestamp === action.pendingItem.timestamp
        );

        if (index === -1) {
          return state;
        }

        let signerState: SignerStateInstance<any, any, any>;
        let specification: SupportedParsingSpecification;
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

        state.stack[index] = {
          ...action.pendingItem,
          status: "done",
          speed: computeDurationInSeconds(
            action.pendingItem.timestamp,
            action.endTime
          ),
          frameResult: action.parseResult[specification],
          response: action.response,
          responseStatus: action.response.status,
          responseBody: action.parseResult,
        };

        return {
          ...state,
          parseResult,
          signerState,
          frameContext,
          homeframeUrl,
          specification,
          type: "initialized",
          stack: state.stack.slice(),
        };
      }
      case "REQUEST_ERROR": {
        const index = state.stack.findIndex(
          (item) => item.timestamp === action.pendingItem.timestamp
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

        return {
          ...state,
          stack:
            !!state.stack[0] && state.stack.length > 0 ? [state.stack[0]] : [],
          type: "initialized",
          frameContext,
          signerState,
          specification: signerState.specification,
        };
      }
      case "RESET_INITIAL_FRAME": {
        const { frameContext = {}, signerState } = resolveSignerRef.current({
          parseResult: action.parseResult,
        });
        const frameResult = action.parseResult[signerState.specification];

        return {
          type: "initialized",
          signerState,
          frameContext,
          specification: signerState.specification,
          homeframeUrl: action.homeframeUrl,
          parseResult: action.parseResult,
          stack: [
            {
              request: {
                method: "GET",
                url: action.homeframeUrl,
              },
              url: action.homeframeUrl,
              requestDetails: {},
              response: new Response(JSON.stringify(frameResult), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }),
              responseStatus: 200,
              timestamp: new Date(),
              speed: 0,
              frameResult,
              status: "done",
              responseBody: frameResult,
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

type UseFrameStateOptions = {
  initialParseResult?: ParseFramesWithReportsResult | null;
  initialFrameUrl?: string | null;
  resolveSpecification: ResolveSignerFunction;
};

export type FrameStateAPI = {
  dispatch: React.Dispatch<FrameReducerActions>;
  clear: () => void;
  createGetPendingItem: (arg: {
    request: FrameGETRequest;
  }) => FrameStackGetPending;
  createPostPendingItem: <
    TSignerStateActionContext extends SignerStateActionContext<any, any>,
  >(arg: {
    action: SignedFrameAction;
    request: FramePOSTRequest<TSignerStateActionContext>;
    /**
     * Optional, allows to override the start time
     *
     * @defaultValue new Date()
     */
    startTime?: Date;
  }) => FrameStackPostPending;
  markAsDone: (arg: {
    pendingItem: FrameStackGetPending | FrameStackPostPending;
    endTime: Date;
    response: Response;
    parseResult: ParseFramesWithReportsResult;
  }) => void;
  markAsDoneWithRedirect: (arg: {
    pendingItem: FrameStackPostPending;
    endTime: Date;
    location: string;
    response: Response;
    responseBody: unknown;
  }) => void;
  markAsDoneWithErrorMessage: (arg: {
    pendingItem: FrameStackPostPending;
    endTime: Date;
    response: Response;
    responseData: ErrorMessageResponse;
  }) => void;
  markAsFailed: (arg: {
    pendingItem: FrameStackGetPending | FrameStackPostPending;
    endTime: Date;
    requestError: Error;
    response: Response | null;
    responseBody: unknown;
    responseStatus: number;
  }) => void;
  markAsFailedWithRequestError: (arg: {
    endTime: Date;
    pendingItem: FrameStackPostPending;
    error: Error;
    response: Response;
    responseBody: unknown;
  }) => void;
  /**
   * If arg is omitted it will reset the frame stack to initial frame and resolves the specification again.
   * Otherwise it will set the frame state to provided values and resolve the specification.
   */
  reset: (arg?: {
    homeframeUrl: string;
    parseResult: ParseFramesWithReportsResult;
  }) => void;
};

export function useFrameState({
  initialParseResult,
  initialFrameUrl,
  resolveSpecification,
}: UseFrameStateOptions): [FrameState, FrameStateAPI] {
  const resolveSpecificationRef = useFreshRef(resolveSpecification);
  const reducerRef = useRef(createFramesStackReducer(resolveSpecificationRef));
  const [state, dispatch] = useReducer(
    reducerRef.current,
    [initialParseResult, initialFrameUrl] as const,
    ([parseResult, frameUrl]): FrameState => {
      if (parseResult && frameUrl) {
        const { frameContext = {}, signerState } = resolveSpecification({
          parseResult,
        });
        const frameResult = parseResult[signerState.specification];

        return {
          type: "initialized",
          frameContext,
          signerState,
          specification: signerState.specification,
          homeframeUrl: frameUrl,
          parseResult,
          stack: [
            {
              response: new Response(JSON.stringify(frameResult), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }),
              responseStatus: 200,
              responseBody: frameResult,
              timestamp: new Date(),
              requestDetails: {},
              request: {
                method: "GET",
                url: frameUrl,
              },
              speed: 0,
              frameResult,
              status: "done",
              url: frameUrl,
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
                method: "GET",
                request: {
                  method: "GET",
                  url: frameUrl,
                },
                url: frameUrl,
                requestDetails: {},
                timestamp: new Date(),
                status: "pending",
              },
            ]
          : [],
      };
    }
  );

  const api: FrameStateAPI = useMemo(() => {
    return {
      dispatch,
      clear() {
        dispatch({
          action: "CLEAR",
        });
      },
      createGetPendingItem(arg) {
        const item: FrameStackGetPending = {
          method: "GET",
          request: arg.request,
          requestDetails: {},
          url: arg.request.url,
          timestamp: new Date(),
          status: "pending",
        };

        dispatch({
          action: "LOAD",
          item,
        });

        return item;
      },
      createPostPendingItem(arg) {
        const item: FrameStackPostPending = {
          method: "POST",
          request: arg.request,
          requestDetails: {
            body: arg.action.body,
            searchParams: arg.action.searchParams,
          },
          url: arg.action.searchParams.get("postUrl") ?? "missing postUrl",
          timestamp: arg.startTime ?? new Date(),
          status: "pending",
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
          response: arg.response.clone(),
          endTime: arg.endTime,
        });
      },
      markAsDoneWithErrorMessage(arg) {
        dispatch({
          action: "DONE_WITH_ERROR_MESSAGE",
          pendingItem: arg.pendingItem,
          item: {
            ...arg.pendingItem,
            responseStatus: arg.response.status,
            response: arg.response.clone(),
            speed: computeDurationInSeconds(
              arg.pendingItem.timestamp,
              arg.endTime
            ),
            status: "message",
            type: "error",
            message: arg.responseData.message,
            responseBody: arg.responseData,
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
            response: arg.response.clone(),
            responseBody: arg.responseBody,
            responseStatus: arg.response.status,
            status: "doneRedirect",
            speed: computeDurationInSeconds(
              arg.pendingItem.timestamp,
              arg.endTime
            ),
          },
        });
      },
      markAsFailed(arg) {
        dispatch({
          action: "REQUEST_ERROR",
          pendingItem: arg.pendingItem,
          item: {
            request: arg.pendingItem.request,
            requestDetails: arg.pendingItem.requestDetails,
            timestamp: arg.pendingItem.timestamp,
            url: arg.pendingItem.url,
            response: arg.response?.clone() ?? null,
            responseStatus: arg.responseStatus,
            requestError: arg.requestError,
            speed: computeDurationInSeconds(
              arg.pendingItem.timestamp,
              arg.endTime
            ),
            status: "requestError",
            responseBody: arg.responseBody,
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
            response: arg.response.clone(),
            responseStatus: arg.response.status,
            responseBody: arg.responseBody,
            speed: computeDurationInSeconds(
              arg.pendingItem.timestamp,
              arg.endTime
            ),
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
          });
        }
      },
    };
  }, [dispatch]);

  return [state, api];
}
