import { FrameUI } from "@frames.js/render";
import type { Frame } from "frames.js";
import { useMockFrame } from "./use-mock-frame";

type FramePreviewProps = {
  frame: Partial<Frame>;
};

export function FramePreview({ frame }: FramePreviewProps) {
  const frameState = useMockFrame({
    frame,
  });

  return <FrameUI frameState={frameState} allowPartialFrame />;
}
