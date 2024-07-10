import type {
  FramesStackItem,
  FrameStackDone,
  GetFrameResult,
  FrameStackMessage,
  FrameStackRequestError,
} from "../types";
import type { PartialFrame } from "./types";

type FrameResultFailure = Exclude<GetFrameResult, { status: "success" }>;

type FrameStackItemWithPartialFrame = Omit<FrameStackDone, "frameResult"> & {
  frameResult: Omit<FrameResultFailure, "frame"> & {
    frame: PartialFrame;
  };
};

export function isPartialFrameStackItem(
  stackItem: FramesStackItem
): stackItem is FrameStackItemWithPartialFrame {
  return (
    stackItem.status === "done" &&
    stackItem.frameResult.status === "failure" &&
    !!stackItem.frameResult.frame.image &&
    !!stackItem.frameResult.frame.buttons &&
    stackItem.frameResult.frame.buttons.length > 0
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
