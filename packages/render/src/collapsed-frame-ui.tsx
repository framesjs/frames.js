import type { ImgHTMLAttributes } from "react";
import React, { useState } from "react";
import type { Frame } from "frames.js";
import type { FrameTheme, FrameState } from "./types";
import type { UseFrameReturnValue } from "./unstable-types";
import { isValidPartialFrame } from "./ui/utils";

const defaultTheme: Required<FrameTheme> = {
  buttonBg: "#fff",
  buttonBorderColor: "#ccc",
  buttonHoverBg: "#efefef",
  buttonColor: "#444",
  buttonRadius: "4",
  bg: "#efefef",
};

const getThemeWithDefaults = (theme: FrameTheme): FrameTheme => {
  return {
    ...defaultTheme,
    ...theme,
  };
};

export type CollapsedFrameUIProps = {
  frameState:
    | FrameState<any, any>
    | UseFrameReturnValue<any, any, any, any, any>;
  theme?: FrameTheme;
  FrameImage?: React.FC<ImgHTMLAttributes<HTMLImageElement> & { src: string }>;
  allowPartialFrame?: boolean;
};

/**
 * A UI component only, that should be easy for any app to integrate.
 *
 * This component doesn't support Frames v2.
 */
export function CollapsedFrameUI({
  frameState,
  theme,
  FrameImage,
  allowPartialFrame,
}: CollapsedFrameUIProps): React.JSX.Element | null {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const currentFrame = frameState.currentFrameStackItem;
  const isLoading = currentFrame?.status === "pending" || isImageLoading;
  const resolvedTheme = getThemeWithDefaults(theme ?? {});

  if (!frameState.homeframeUrl) {
    return null;
  }

  if (!currentFrame) {
    return null;
  }

  if (
    currentFrame.status === "done" &&
    currentFrame.frameResult.status === "failure" &&
    !(allowPartialFrame && isValidPartialFrame(currentFrame.frameResult))
  ) {
    return null;
  }

  let frame: Frame | Partial<Frame> | undefined;

  if (currentFrame.status === "done") {
    if (currentFrame.frameResult.specification === "farcaster_v2") {
      // Do not render farcaster frames v2 as collapsed because they don't have such UI
      return null;
    }

    frame = currentFrame.frameResult.frame;
  } else if (
    currentFrame.status === "message" ||
    currentFrame.status === "doneRedirect"
  ) {
    frame = currentFrame.request.sourceFrame;
  } else if (currentFrame.status === "requestError") {
    frame =
      "sourceFrame" in currentFrame.request
        ? currentFrame.request.sourceFrame
        : undefined;
  }

  const ImageEl = FrameImage ? FrameImage : "img";

  return (
    <div
      style={{ backgroundColor: resolvedTheme.bg }}
      className="flex w-full gap-2 rounded p-2 items-center"
    >
      <div
        className="relative max-h-[60px] shrink-0"
        style={{ aspectRatio: "1/1" }}
      >
        {" "}
        {/* Ensure the container fills the height */}
        {!!frame && !!frame.image && (
          <ImageEl
            src={frame.image}
            key={frame.image}
            alt="Frame image"
            width="100%"
            style={{
              filter: isLoading ? "blur(4px)" : undefined,
              borderRadius: `${resolvedTheme.buttonRadius}px`,
              border: `1px solid ${resolvedTheme.buttonBorderColor}`,
              objectFit: "cover",
              width: "100%",
              aspectRatio: "1/1",
            }}
            onLoadStart={() => {
              setIsImageLoading(true);
            }}
            onLoad={() => {
              setIsImageLoading(false);
            }}
            onError={() => {
              setIsImageLoading(false);
            }}
          />
        )}
      </div>
      {/* min-w-[0] is needed to truncate the text properly */}
      <div className="flex flex-col flex-1 justify-center min-w-[0]">
        <span className="font-semibold block truncate">{frame?.title}</span>
        <span className="text-gray-500 text-xs block truncate">
          {new URL(currentFrame.url).hostname}
        </span>
      </div>
      {!!frame && !!frame.buttons ? (
        <div className="flex items-center shrink-0">
          <button
            type="button"
            disabled={isLoading}
            className={`p-2 ${
              isLoading ? "bg-gray-100" : ""
            } border text-sm text-gray-800 rounded`}
            style={{
              flex: "1 1 0px",
              // fixme: hover style
              backgroundColor: resolvedTheme.buttonBg,
              borderColor: resolvedTheme.buttonBorderColor,
              color: resolvedTheme.buttonColor,
              cursor: isLoading ? undefined : "pointer",
            }}
          >
            {!!frame.buttons[0] && frame.buttons[0].label.length < 12
              ? frame.buttons[0].label
              : "View"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
