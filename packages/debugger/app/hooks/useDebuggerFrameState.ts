import type {
  FrameState,
  FrameStateAPI,
  UseFrameStateOptions,
} from "@frames.js/render/unstable-types";
import { useFrameState } from "@frames.js/render/unstable-use-frame-state";

function computeDurationInSeconds(start: Date, end: Date): number {
  return Number(((end.getTime() - start.getTime()) / 1000).toFixed(2));
}

type ExtraPending = {
  startTime: Date;
  requestDetails: {
    body?: object;
    searchParams?: URLSearchParams;
  };
};

type SharedResponseExtra = {
  response: Response;
  responseStatus: number;
  responseBody: unknown;
  /**
   * The speed of the response in seconds
   */
  speed: number;
};

type ExtraDone = SharedResponseExtra;

type ExtraDoneRedirect = SharedResponseExtra;

type ExtraRequestError = Pick<SharedResponseExtra, "speed"> & {
  response: Response | null;
  responseStatus: number;
  responseBody: unknown;
};

type ExtraMessage = SharedResponseExtra;

type DebuggerFrameState = FrameState<
  ExtraPending,
  ExtraDone,
  ExtraDoneRedirect,
  ExtraRequestError,
  ExtraMessage
>;
type DebuggerFrameStateAPI = FrameStateAPI<
  ExtraPending,
  ExtraDone,
  ExtraDoneRedirect,
  ExtraRequestError,
  ExtraMessage
>;

type DebuggerFrameStateOptions = Omit<
  UseFrameStateOptions<
    ExtraPending,
    ExtraDone,
    ExtraDoneRedirect,
    ExtraRequestError,
    ExtraMessage
  >,
  "resolveDoneExtra"
>;

export function useDebuggerFrameState(
  options: DebuggerFrameStateOptions
): [DebuggerFrameState, DebuggerFrameStateAPI] {
  return useFrameState<
    ExtraPending,
    ExtraDone,
    ExtraDoneRedirect,
    ExtraRequestError,
    ExtraMessage
  >({
    ...options,
    resolveGETPendingExtra() {
      return {
        startTime: new Date(),
        requestDetails: {},
      };
    },
    resolvePOSTPendingExtra(arg) {
      return {
        startTime: new Date(),
        requestDetails: {
          body: arg.action.body,
          searchParams: arg.action.searchParams,
        },
      };
    },
    resolveDoneExtra(arg) {
      return {
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
