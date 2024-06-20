import type { ImgHTMLAttributes } from "react";
import React, { useState } from "react";
import type { Frame, FrameButton } from "frames.js";
import type { FrameTheme, FrameState } from "./types";

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
    !(
      allowPartialFrame &&
      // Need at least image and buttons to render a partial frame
      currentFrame.frameResult.frame.image &&
      currentFrame.frameResult.frame.buttons
    )
  ) {
    return null;
  }

  let frame: Frame | Partial<Frame> | undefined;

  if (currentFrame.status === "done") {
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
      {!!frame && !!frame.buttons && frame.buttons.length > 0 ? (
        <div className="flex items-center shrink-0">
          {frame.buttons
            .slice(0, 1)
            .map((frameButton: FrameButton, index: number) => (
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
                onClick={() => {
                  Promise.resolve(
                    frameState.onButtonPress(
                      // Partial frame could have enough data to handle button press
                      frame as Frame,
                      frameButton,
                      index
                    )
                  ).catch((e: unknown) => {
                    // eslint-disable-next-line no-console -- provide feedback to the user
                    console.error(e);
                  });
                }}
                // eslint-disable-next-line react/no-array-index-key -- this is fine
                key={index}
              >
                {frameButton.action === "mint" ? `⬗ ` : ""}
                {frameButton.label}
                {frameButton.action === "tx" ? (
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    role="img"
                    viewBox="0 0 16 16"
                    className="ml-1 mb-[2px] text-gray-400 inline-block select-none align-text-middle overflow-visible"
                    width="12"
                    height="12"
                    fill="currentColor"
                  >
                    <path d="M9.504.43a1.516 1.516 0 0 1 2.437 1.713L10.415 5.5h2.123c1.57 0 2.346 1.909 1.22 3.004l-7.34 7.142a1.249 1.249 0 0 1-.871.354h-.302a1.25 1.25 0 0 1-1.157-1.723L5.633 10.5H3.462c-1.57 0-2.346-1.909-1.22-3.004L9.503.429Zm1.047 1.074L3.286 8.571A.25.25 0 0 0 3.462 9H6.75a.75.75 0 0 1 .694 1.034l-1.713 4.188 6.982-6.793A.25.25 0 0 0 12.538 7H9.25a.75.75 0 0 1-.683-1.06l2.008-4.418.003-.006a.036.036 0 0 0-.004-.009l-.006-.006-.008-.001c-.003 0-.006.002-.009.004Z" />
                  </svg>
                ) : (
                  ""
                )}
                {frameButton.action === "post_redirect" ||
                frameButton.action === "link"
                  ? ` ↗`
                  : ""}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
