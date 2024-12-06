import type {
  ParseFramesWithReportsResult,
  ParseResult,
  ParseResultFramesV1Failure,
} from "frames.js/frame-parsers";
import type {
  CastActionFrameResponse,
  CastActionMessageResponse,
  ComposerActionFormResponse,
} from "frames.js/types";
import type { PartialFrame } from "./ui/types";

export async function tryCallAsync<TResult>(
  promiseFn: () => Promise<TResult>
): Promise<TResult | Error> {
  try {
    return promiseFn().catch((e) => {
      if (e instanceof Error) {
        return e;
      }

      return new TypeError("Unexpected error, check the console for details");
    });
  } catch (e) {
    return new TypeError("Unexpected error, check the console for details");
  }
}

export function tryCall<TReturn>(fn: () => TReturn): TReturn | Error {
  try {
    return fn();
  } catch (e) {
    if (e instanceof Error) {
      return e;
    }

    return new TypeError("Unexpected error, check the console for details");
  }
}

export function isParseFramesWithReportsResult(
  value: unknown
): value is ParseFramesWithReportsResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "openframes" in value &&
    "farcaster" in value
  );
}

export function isParseResult(value: unknown): value is ParseResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    !("openframes" in value) &&
    !("farcaster" in value)
  );
}

export type ParseResultWithPartialFrame = Omit<
  ParseResultFramesV1Failure,
  "frame"
> & {
  frame: PartialFrame;
};

// rename
export function isPartialFrame(
  value: ParseResult
): value is ParseResultWithPartialFrame {
  return (
    value.status === "failure" &&
    !!value.frame.image &&
    !!value.frame.buttons &&
    value.frame.buttons.length > 0
  );
}

export function isComposerFormActionResponse(
  response: unknown
): response is ComposerActionFormResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "type" in response &&
    response.type === "form"
  );
}

export function isCastActionFrameResponse(
  response: unknown
): response is CastActionFrameResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "type" in response &&
    response.type === "frame" &&
    "frameUrl" in response &&
    typeof response.frameUrl === "string"
  );
}

export function isCastActionMessageResponse(
  response: unknown
): response is CastActionMessageResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "type" in response &&
    response.type === "message" &&
    "message" in response &&
    typeof response.message === "string"
  );
}

/**
 * Merges all search params in order from left to right into the URL.
 *
 * @param url - The URL to merge the search params into. Either fully qualified or path only.
 */
export function mergeSearchParamsToUrl(
  url: string,
  ...searchParams: URLSearchParams[]
): string {
  const temporaryDomain = "temporary-for-parsing-purposes.tld";
  const parsedProxyUrl = new URL(url, `http://${temporaryDomain}`);

  searchParams.forEach((params) => {
    params.forEach((value, key) => {
      parsedProxyUrl.searchParams.set(key, value);
    });
  });

  return parsedProxyUrl.hostname === temporaryDomain
    ? `${parsedProxyUrl.pathname}${parsedProxyUrl.search}`
    : parsedProxyUrl.toString();
}
