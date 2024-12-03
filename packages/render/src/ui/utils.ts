import type {
  FramesStackItem,
  FrameStackDone,
  GetFrameResult,
  FrameStackMessage,
  FrameStackRequestError,
} from "../types";
import type {
  PartialFrameV2,
  FramesStackItem as UnstableFramesStackItem,
  FrameStackMessage as UnstableFrameStackMessage,
  FrameStackRequestError as UnstableFrameStackRequestError,
} from "../unstable-types";
import type { PartialFrame } from "./types";

type FrameResultFailure = Exclude<GetFrameResult, { status: "success" }>;
type FrameResultSuccess = Extract<GetFrameResult, { status: "success" }>;

type FrameResultSuccessFrameV1 = Extract<
  FrameResultSuccess,
  { specification: "farcaster" | "openframes" }
>;

type FrameResultFailureFrameV1 = Extract<
  FrameResultFailure,
  { specification: "farcaster" | "openframes" }
>;

type FrameV1FailureResult = Omit<FrameResultFailureFrameV1, "frame"> & {
  frame: PartialFrame;
};

type FrameResultFailureFrameV2 = Extract<
  FrameResultFailure,
  { specification: "farcaster_v2" }
>;

type FrameResultSuccessFrameV2 = Extract<
  FrameResultSuccess,
  { specification: "farcaster_v2" }
>;

type FrameV2FailureResult = Omit<FrameResultFailureFrameV2, "frame"> & {
  frame: PartialFrameV2;
};

type FrameStackItemWithPartialFrame = Omit<FrameStackDone, "frameResult"> & {
  frameResult: FrameV1FailureResult | FrameV2FailureResult;
};

export function isPartialFrameStackItem(
  stackItem: FramesStackItem | UnstableFramesStackItem
): stackItem is FrameStackItemWithPartialFrame {
  return (
    stackItem.status === "done" &&
    stackItem.frameResult.status === "failure" &&
    (isValidPartialFrameV1(stackItem.frameResult) ||
      isValidPartialFrameV2(stackItem.frameResult))
  );
}

export function getErrorMessageFromFramesStackItem(
  item:
    | FrameStackMessage
    | FrameStackRequestError
    | UnstableFrameStackMessage
    | UnstableFrameStackRequestError
): string {
  if (item.status === "message") {
    return item.message;
  }

  if (item.requestError instanceof Error) {
    return item.requestError.message;
  }

  return "An error occurred";
}

export function isValidPartialFrameV1(
  value: GetFrameResult
): value is FrameV1FailureResult {
  if (
    value.specification !== "farcaster" &&
    value.specification !== "openframes"
  ) {
    return false;
  }

  return (
    !!value.frame.image &&
    !!value.frame.buttons &&
    value.frame.buttons.length > 0
  );
}

export function isValidPartialFrameV2(
  value: GetFrameResult
): value is FrameV2FailureResult {
  if (value.specification !== "farcaster_v2") {
    return false;
  }

  return (
    !!value.frame.imageUrl &&
    !!value.frame.button &&
    !!value.frame.button.title &&
    !!value.frame.button.action &&
    !!value.frame.button.action.url
  );
}

/**
 * All partial frames need at least an image and button to be considered valid.
 */
export function isValidPartialFrame(frameResult: GetFrameResult): boolean {
  return (
    isValidPartialFrameV1(frameResult) || isValidPartialFrameV2(frameResult)
  );
}

export function isValidFrameV1(
  value: GetFrameResult
): value is FrameResultSuccessFrameV1 {
  return (
    value.status === "success" &&
    (value.specification === "farcaster" ||
      value.specification === "openframes")
  );
}

export function isValidFrameV2(
  value: GetFrameResult
): value is FrameResultSuccessFrameV2 {
  return value.status === "success" && value.specification === "farcaster_v2";
}

export function isValidFrame(value: GetFrameResult): boolean {
  return isValidFrameV1(value) || isValidFrameV2(value);
}
