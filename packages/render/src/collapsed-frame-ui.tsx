import type { ImgHTMLAttributes } from "react";
import React, { useState } from "react";
import type { Frame } from "frames.js";
import type { FrameTheme, FrameState } from "./types";
import {
  getFrameParseResultFromStackItemBySpecifications,
  isPartialFrameParseResult,
} from "./helpers";

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
  frameState: FrameState;
  theme?: FrameTheme;
  FrameImage?: React.FC<ImgHTMLAttributes<HTMLImageElement> & { src: string }>;
  allowPartialFrame?: boolean;
};

/** A UI component only, that should be easy for any app to integrate */
export function CollapsedFrameUI({
  frameState,
  theme,
  FrameImage,
  allowPartialFrame,
}: CollapsedFrameUIProps): React.JSX.Element | null {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const { currentFrameStackItem, specifications } = frameState;
  const isLoading =
    currentFrameStackItem?.status === "pending" || isImageLoading;
  const resolvedTheme = getThemeWithDefaults(theme ?? {});

  if (!frameState.homeframeUrl) {
    return null;
  }

  if (!currentFrameStackItem) {
    return null;
  }

  if (currentFrameStackItem.status === "done") {
    const currentParseResult = getFrameParseResultFromStackItemBySpecifications(
      currentFrameStackItem,
      specifications
    );

    if (
      currentParseResult.status === "failure" &&
      (!allowPartialFrame || !isPartialFrameParseResult(currentParseResult))
    ) {
      return null;
    }
  }

  let frame: Frame | Partial<Frame> | undefined;

  if (currentFrameStackItem.status === "done") {
    const currentParseResult = getFrameParseResultFromStackItemBySpecifications(
      currentFrameStackItem,
      specifications
    );

    frame = currentParseResult.frame;
  } else if (
    currentFrameStackItem.status === "message" ||
    currentFrameStackItem.status === "doneRedirect"
  ) {
    frame = currentFrameStackItem.request.sourceFrame;
  } else if (currentFrameStackItem.status === "requestError") {
    frame =
      "sourceFrame" in currentFrameStackItem.request
        ? currentFrameStackItem.request.sourceFrame
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
          {new URL(currentFrameStackItem.url).hostname}
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
            {frame.buttons.length === 1 &&
            !!frame.buttons[0] &&
            frame.buttons[0].label.length < 12
              ? frame.buttons[0].label
              : "View"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
