import type {
  Frame,
  GetFrameResult,
  SupportedParsingSpecification,
} from "frames.js";
import type {
  ParseFramesWithReportsResult,
  ParseResult,
  ParseResultWithFrameworkDetails,
} from "frames.js/frame-parsers";
import type { PartialFrame } from "./ui/types";
import type {
  FramesStackItem,
  FrameStackDone,
  FrameStackMessage,
  FrameStackRequestError,
} from "./types";

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

function isParseResult(value: unknown): value is ParseResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "frame" in value
  );
}

export function createParseFramesWithReportsObject(
  input: Frame | ParseResult
): ParseFramesWithReportsResult {
  if (isParseResult(input)) {
    if ("accepts" in input.frame || "accepts" in input.reports) {
      // this is open frame
      return {
        openframes: input,
        farcaster: {
          status: "failure",
          frame: input.frame,
          reports: {},
          specification: "farcaster",
        },
      };
    }

    return {
      farcaster: input,
      openframes:
        "accepts" in input.frame || "accepts" in input.reports
          ? input
          : {
              status: "failure",
              frame: input.frame,
              reports: {},
              specification: "openframes",
            },
    };
  }

  return {
    // always treat the frame as farcaster frame
    farcaster: {
      status: "success",
      frame: input,
      reports: {},
      specification: "farcaster",
    },
    openframes:
      // detect if it is a valid openframe
      !input.accepts || input.accepts.length === 0
        ? {
            status: "failure",
            frame: input,
            reports: {},
            specification: "openframes",
          }
        : {
            status: "success",
            frame: input,
            reports: {},
            specification: "openframes",
          },
  };
}

type FailedParseResultWithFrameworkDetails = Exclude<
  ParseResultWithFrameworkDetails,
  { status: "success" }
>;

type ParseResultWithFrameworkDetailsWithPartialFrame = Omit<
  FailedParseResultWithFrameworkDetails,
  "frame"
> & {
  frame: PartialFrame;
};

export function isPartialFrameParseResult(
  parseResult: ParseResultWithFrameworkDetails
): parseResult is ParseResultWithFrameworkDetailsWithPartialFrame {
  return (
    parseResult.status === "failure" &&
    !!parseResult.frame.image &&
    !!parseResult.frame.buttons &&
    parseResult.frame.buttons.length > 0
  );
}

export function getErrorMessageFromFramesStackItem(
  item: FrameStackMessage | FrameStackRequestError
): string {
  if (item.status === "message") {
    return item.message;
  }

  if (item.requestError instanceof Error) {
    return item.requestError.message;
  }

  return "An error occurred";
}

export function getDoneStackItemFromStackItem(
  stackItem: FramesStackItem | undefined
): FrameStackDone | undefined {
  if (!stackItem || stackItem.status !== "done") {
    return undefined;
  }

  return undefined;
}

export function getFrameParseResultFromStackItemBySpecifications(
  stackItem: FrameStackDone,
  specifications: SupportedParsingSpecification[]
): GetFrameResult {
  // find valid parse result for given specification or fallback to any valid parse result
  for (const specification of specifications) {
    if (stackItem.parseResult[specification].status === "success") {
      return stackItem.parseResult[specification];
    }
  }

  const [specification] = specifications;

  if (!specification) {
    throw new Error("No specification provided");
  }

  // return the parse result even if it is invalid, because there was nothing to fall back to
  return stackItem.parseResult[specification];
}

export function getFrameFromStackItemBySpecification(
  stackItem: FrameStackDone,
  specifications: SupportedParsingSpecification[]
): undefined | Frame | Partial<Frame> {
  const result = getFrameParseResultFromStackItemBySpecifications(
    stackItem,
    specifications
  );

  return result.frame;
}
