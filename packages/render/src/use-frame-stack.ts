import { useMemo, useReducer } from "react";
import type { Frame } from "frames.js";
import type {
  ParseFramesWithReportsResult,
  ParseResult,
} from "frames.js/frame-parsers";
import type {
  CastActionMessageResponse,
  ErrorMessageResponse,
} from "frames.js/types";
import type {
  FrameGETRequest,
  FramePOSTRequest,
  FrameReducerActions,
  FramesStack,
  FrameStackGetPending,
  FrameStackPostPending,
  SignedFrameAction,
} from "./types";
import {
  createParseFramesWithReportsObject,
  isParseFramesWithReportsResult,
} from "./helpers";

function computeDurationInSeconds(start: Date, end: Date): number {
  return Number(((end.getTime() - start.getTime()) / 1000).toFixed(2));
}

function framesStackReducer(
  state: FramesStack,
  action: FrameReducerActions
): FramesStack {
  switch (action.action) {
    case "LOAD":
      return [action.item, ...state];
    case "DONE_REDIRECT": {
      const index = state.findIndex(
        (item) => item.timestamp === action.pendingItem.timestamp
      );

      if (index === -1) {
        return state;
      }

      state[index] = {
        ...action.pendingItem,
        ...action.item,
        status: "doneRedirect",
      };

      return state.slice();
    }
    case "DONE":
    case "REQUEST_ERROR": {
      const index = state.findIndex(
        (item) => item.timestamp === action.pendingItem.timestamp
      );

      if (index === -1) {
        return state;
      }

      state[index] = action.item;

      return state.slice();
    }
    case "RESET_INITIAL_FRAME": {
      return [
        {
          request: {
            method: "GET",
            url: action.homeframeUrl,
          },
          url: action.homeframeUrl,
          requestDetails: {},
          response: new Response(JSON.stringify(action.parseResult), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
          responseStatus: 200,
          timestamp: new Date(),
          speed: 0,
          parseResult: action.parseResult,
          status: "done",
          responseBody: action.parseResult,
        },
      ];
    }
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

type UseFrameStackOptions = {
  /**
   * Initial frame to be used, if the value isn't of ParseFramesWithReportsResult type then it will be converted to it
   * using initialSpecification.
   */
  initialFrame?: Frame | ParseResult | ParseFramesWithReportsResult;
  initialFrameUrl?: string | null;
};

export type FrameStackAPI = {
  dispatch: React.Dispatch<FrameReducerActions>;
  clear: () => void;
  createGetPendingItem: (arg: {
    request: FrameGETRequest;
  }) => FrameStackGetPending;
  createPostPendingItem: (arg: {
    action: SignedFrameAction;
    request: FramePOSTRequest;
    /**
     * Optional, allows to override the start time
     *
     * @defaultValue new Date()
     */
    startTime?: Date;
  }) => FrameStackPostPending;
  /**
   * Creates a pending item without dispatching it
   */
  createCastOrComposerActionPendingItem: (arg: {
    action: SignedFrameAction;
    request: FramePOSTRequest;
  }) => FrameStackPostPending;
  markCastMessageAsDone: (arg: {
    pendingItem: FrameStackPostPending;
    endTime: Date;
    response: Response;
    responseData: CastActionMessageResponse;
  }) => void;
  markCastFrameAsDone: (arg: {
    pendingItem: FrameStackPostPending;
    endTime: Date;
  }) => void;
  markComposerFormActionAsDone: (arg: {
    pendingItem: FrameStackPostPending;
    endTime: Date;
  }) => void;
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
  reset: (arg: {
    frame: Frame | ParseResult | ParseFramesWithReportsResult;
    homeframeUrl: string;
  }) => void;
};

export function useFrameStack({
  initialFrame,
  initialFrameUrl,
}: UseFrameStackOptions): [FramesStack, FrameStackAPI] {
  const [stack, dispatch] = useReducer(
    framesStackReducer,
    [initialFrame, initialFrameUrl] as const,
    ([frame, frameUrl]): FramesStack => {
      if (frame) {
        const parseResult = isParseFramesWithReportsResult(frame)
          ? frame
          : createParseFramesWithReportsObject(frame);
        return [
          {
            response: new Response(JSON.stringify(parseResult), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
            responseStatus: 200,
            responseBody: parseResult,
            timestamp: new Date(),
            requestDetails: {},
            request: {
              method: "GET",
              url: frameUrl ?? "",
            },
            speed: 0,
            parseResult,
            status: "done",
            url: frameUrl ?? "",
          },
        ];
      } else if (frameUrl) {
        // prevent flash of empty if will shortly set this in first rerender
        // this is then handled by fetchFrame having second argument set to true so the stack is cleared
        return [
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
        ];
      }

      return [];
    }
  );

  const api: FrameStackAPI = useMemo(() => {
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
      createCastOrComposerActionPendingItem(arg) {
        return {
          method: "POST",
          requestDetails: {
            body: arg.action.body,
            searchParams: arg.action.searchParams,
          },
          request: arg.request,
          status: "pending",
          timestamp: new Date(),
          url: arg.action.searchParams.get("postUrl") ?? "missing postUrl",
        } satisfies FrameStackPostPending;
      },
      markCastFrameAsDone() {
        // noop
      },
      markCastMessageAsDone(arg) {
        dispatch({
          action: "LOAD",
          item: arg.pendingItem,
        });
        dispatch({
          action: "DONE",
          pendingItem: arg.pendingItem,
          item: {
            ...arg.pendingItem,
            status: "message",
            message: arg.responseData.message,
            response: arg.response.clone(),
            responseBody: arg.responseData,
            responseStatus: arg.response.status,
            speed: computeDurationInSeconds(
              arg.pendingItem.timestamp,
              arg.endTime
            ),
            type: "info",
          },
        });
      },
      markComposerFormActionAsDone() {
        // noop
      },
      markAsDone(arg) {
        dispatch({
          action: "DONE",
          pendingItem: arg.pendingItem,
          item: {
            ...arg.pendingItem,
            status: "done",
            parseResult: arg.parseResult,
            speed: computeDurationInSeconds(
              arg.pendingItem.timestamp,
              arg.endTime
            ),
            response: arg.response.clone(),
            responseStatus: arg.response.status,
            responseBody: arg.parseResult,
          },
        });
      },
      markAsDoneWithErrorMessage(arg) {
        dispatch({
          action: "DONE",
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
        dispatch({
          action: "RESET_INITIAL_FRAME",
          homeframeUrl: arg.homeframeUrl,
          parseResult: isParseFramesWithReportsResult(arg.frame)
            ? arg.frame
            : createParseFramesWithReportsObject(arg.frame),
        });
      },
    };
  }, [dispatch]);

  return [stack, api];
}
