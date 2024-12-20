import type {
  FramesStack,
  FramesStackItem,
  FrameState,
  FrameStateAPI,
  UseFrameStateOptions,
} from "@frames.js/render/unstable-types";
import { useFrameState } from "@frames.js/render/unstable-use-frame-state";
import type { ParseFramesWithReportsResult } from "frames.js/frame-parsers";

function computeDurationInSeconds(start: Date, end: Date): number {
  return Number(((end.getTime() - start.getTime()) / 1000).toFixed(2));
}

type DebuggerSharedResponseExtra = {
  timestamp: Date;
  requestDetails: {
    body?: object;
    searchParams?: URLSearchParams;
  };
  response: Response;
  responseStatus: number;
  responseBody: unknown;
  /**
   * The speed of the response in seconds
   */
  speed: number;
};

export type DebuggerExtraPending = Pick<
  DebuggerSharedResponseExtra,
  "timestamp" | "requestDetails"
> & {
  timestamp: Date;
  startTime: Date;
};

export type DebuggerExtraDone = DebuggerSharedResponseExtra & {
  parseResult: ParseFramesWithReportsResult;
};

export type DebuggerExtraDoneRedirect = DebuggerSharedResponseExtra;

export type DebuggerExtraRequestError = Pick<
  DebuggerSharedResponseExtra,
  "speed" | "timestamp" | "requestDetails"
> & {
  response: Response | null;
  responseStatus: number;
  responseBody: unknown;
};

export type DebuggerExtraMessage = DebuggerSharedResponseExtra;

export type DebuggerFrameStackItem = FramesStackItem<
  DebuggerExtraPending,
  DebuggerExtraDone,
  DebuggerExtraDoneRedirect,
  DebuggerExtraRequestError,
  DebuggerExtraMessage
>;

export type DebuggerFrameStack = FramesStack<
  DebuggerExtraPending,
  DebuggerExtraDone,
  DebuggerExtraDoneRedirect,
  DebuggerExtraRequestError,
  DebuggerExtraMessage
>;

type DebuggerFrameState = FrameState<
  DebuggerExtraPending,
  DebuggerExtraDone,
  DebuggerExtraDoneRedirect,
  DebuggerExtraRequestError,
  DebuggerExtraMessage
>;
type DebuggerFrameStateAPI = FrameStateAPI<
  DebuggerExtraPending,
  DebuggerExtraDone,
  DebuggerExtraDoneRedirect,
  DebuggerExtraRequestError,
  DebuggerExtraMessage
>;

type DebuggerFrameStateOptions = Omit<
  UseFrameStateOptions<
    DebuggerExtraPending,
    DebuggerExtraDone,
    DebuggerExtraDoneRedirect,
    DebuggerExtraRequestError,
    DebuggerExtraMessage
  >,
  "resolveDoneExtra"
>;

export function useDebuggerFrameState(
  options: DebuggerFrameStateOptions
): [DebuggerFrameState, DebuggerFrameStateAPI] {
  return useFrameState<
    DebuggerExtraPending,
    DebuggerExtraDone,
    DebuggerExtraDoneRedirect,
    DebuggerExtraRequestError,
    DebuggerExtraMessage
  >({
    ...options,
    initialPendingExtra: {
      requestDetails: {},
      timestamp: new Date(),
      startTime: new Date(),
    },
    resolveGETPendingExtra() {
      return {
        timestamp: new Date(),
        startTime: new Date(),
        requestDetails: {},
      };
    },
    resolvePOSTPendingExtra(arg) {
      return {
        timestamp: new Date(),
        startTime: new Date(),
        requestDetails: {
          body: arg.action.body,
          searchParams: arg.action.searchParams,
        },
      };
    },
    resolveDoneExtra(arg) {
      return {
        parseResult: arg.parseResult,
        timestamp: arg.pendingItem.extra.timestamp,
        requestDetails: arg.pendingItem.extra.requestDetails,
        response: arg.response.clone(),
        speed: computeDurationInSeconds(
          arg.pendingItem.extra.startTime,
          arg.endTime
        ),
        responseBody: arg.responseBody,
        responseStatus: arg.response.status,
      };
    },
    resolveDoneRedirectExtra(arg) {
      return {
        timestamp: arg.pendingItem.extra.timestamp,
        requestDetails: arg.pendingItem.extra.requestDetails,
        speed: computeDurationInSeconds(
          arg.pendingItem.extra.startTime,
          arg.endTime
        ),
        response: arg.response.clone(),
        responseStatus: arg.response.status,
        responseBody: arg.responseBody,
      };
    },
    resolveDoneWithErrorMessageExtra(arg) {
      return {
        timestamp: arg.pendingItem.extra.timestamp,
        requestDetails: arg.pendingItem.extra.requestDetails,
        speed: computeDurationInSeconds(
          arg.pendingItem.extra.startTime,
          arg.endTime
        ),
        response: arg.response.clone(),
        responseBody: arg.responseData,
        responseStatus: arg.response.status,
      };
    },
    resolveFailedExtra(arg) {
      return {
        timestamp: arg.pendingItem.extra.timestamp,
        requestDetails: arg.pendingItem.extra.requestDetails,
        speed: computeDurationInSeconds(
          arg.pendingItem.extra.startTime,
          arg.endTime
        ),
        response: arg.response?.clone() ?? null,
        responseBody: arg.responseBody,
        responseStatus: arg.responseStatus,
      };
    },
    resolveFailedWithRequestErrorExtra(arg) {
      return {
        timestamp: arg.pendingItem.extra.timestamp,
        requestDetails: arg.pendingItem.extra.requestDetails,
        speed: computeDurationInSeconds(
          arg.pendingItem.extra.startTime,
          arg.endTime
        ),
        response: arg.response.clone(),
        responseBody: arg.responseBody,
        responseStatus: arg.response.status,
      };
    },
  });
}
