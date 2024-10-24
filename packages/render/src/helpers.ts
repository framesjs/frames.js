import type { ParseFramesWithReportsResult } from "frames.js/frame-parsers";

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
