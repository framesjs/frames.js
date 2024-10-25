import type {
  ParseFramesWithReportsResult,
  ParseResult,
} from "frames.js/frame-parsers";
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
  Exclude<ParseResult, { status: "success" }>,
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
