import type { ImgHTMLAttributes } from "react";
import React, { useState } from "react";
import type {
  Frame,
  FrameButton,
  SupportedParsingSpecification,
} from "frames.js";
import type {
  ParseFramesWithReportsResult,
  ParseResult,
} from "frames.js/frame-parsers";
import type { FrameTheme, FrameState } from "./types";
import {
  getErrorMessageFromFramesStackItem,
  getFrameParseResultFromStackItemBySpecifications,
  isPartialFrameParseResult,
} from "./helpers";

export const defaultTheme: Required<FrameTheme> = {
  buttonBg: "#fff",
  buttonBorderColor: "#ccc",
  buttonHoverBg: "#efefef",
  buttonColor: "#444",
  buttonRadius: "4",
  bg: "#efefef",
};

const messageSquareIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const octagonXIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

const getThemeWithDefaults = (theme: FrameTheme): FrameTheme => {
  return {
    ...defaultTheme,
    ...theme,
  };
};

type MessageTooltipProps = {
  message: string;
  /**
   * @defaultValue 'message'
   */
  variant?: "message" | "error";
  /**
   * @defaultValue false
   */
  inline?: boolean;
};

function MessageTooltip({
  inline = false,
  message,
  variant = "message",
}: MessageTooltipProps): JSX.Element {
  return (
    <div
      className={`${
        inline
          ? ""
          : "absolute bottom-2 border border-slate-100 rounded-sm shadow-md inset-x-2 bg-white"
      } ${variant === "error" ? "text-red-500" : ""} items-center p-2 flex gap-2 text-sm`}
    >
      {variant === "message" ? messageSquareIcon : octagonXIcon}
      {message}
    </div>
  );
}

export type FrameUIProps = {
  frameState: FrameState;
  theme?: FrameTheme;
  FrameImage?: React.FC<ImgHTMLAttributes<HTMLImageElement> & { src: string }>;
  allowPartialFrame?: boolean;
  /**
   * This option works only with frames created by Frames.js and with debug enabled.
   *
   * @defaultValue false
   */
  enableImageDebugging?: boolean;
};

/** A UI component only, that should be easy for any app to integrate */
export function FrameUI({
  frameState,
  theme,
  FrameImage,
  allowPartialFrame,
  enableImageDebugging,
}: FrameUIProps): React.JSX.Element | null {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const { currentFrameStackItem, specifications } = frameState;
  const isLoading =
    currentFrameStackItem?.status === "pending" || isImageLoading;
  const resolvedTheme = getThemeWithDefaults(theme ?? {});

  if (!frameState.homeframeUrl) {
    return (
      <MessageTooltip inline message="Missing frame url" variant="error" />
    );
  }

  if (!currentFrameStackItem) {
    return null;
  }

  // check if frame is partial and if partials are allowed
  if (currentFrameStackItem.status === "done") {
    const currentFrameParseResult =
      getFrameParseResultFromStackItemBySpecifications(
        currentFrameStackItem,
        specifications
      );

    // not a proper partial frame or partial frames are disabled
    if (
      currentFrameParseResult.status === "failure" &&
      (!allowPartialFrame ||
        !isPartialFrameParseResult(currentFrameParseResult))
    ) {
      return <MessageTooltip inline message="Invalid frame" variant="error" />;
    }
  }

  let frame: Frame | Partial<Frame> | undefined;
  let parseResult: ParseFramesWithReportsResult | undefined;
  let specification: SupportedParsingSpecification | undefined;
  let debugImage: string | undefined;

  if (currentFrameStackItem.status === "done") {
    const parseResultBySpec = getFrameParseResultFromStackItemBySpecifications(
      currentFrameStackItem,
      specifications
    );

    frame = parseResultBySpec.frame;
    parseResult = currentFrameStackItem.parseResult;
    specification = parseResultBySpec.specification;
    debugImage = enableImageDebugging
      ? parseResultBySpec.framesDebugInfo?.image
      : undefined;
  } else if (
    currentFrameStackItem.status === "message" ||
    currentFrameStackItem.status === "doneRedirect"
  ) {
    frame = currentFrameStackItem.request.sourceFrame;
    parseResult = currentFrameStackItem.request.sourceParseResult;
    specification = currentFrameStackItem.request.specification;
  } else if (currentFrameStackItem.status === "requestError") {
    if ("sourceFrame" in currentFrameStackItem.request) {
      frame = currentFrameStackItem.request.sourceFrame;
      parseResult = currentFrameStackItem.request.sourceParseResult;
      specification = currentFrameStackItem.request.specification;
    }
  }

  const ImageEl = FrameImage ? FrameImage : "img";
  return (
    <div
      style={{ backgroundColor: resolvedTheme.bg }}
      className="flex flex-col w-full gap-2 rounded-br rounded-bl"
    >
      <div className="relative w-full" style={{ height: "100%" }}>
        {" "}
        {/* Ensure the container fills the height */}
        {currentFrameStackItem.status === "message" ? (
          <MessageTooltip
            inline={!frame || !("image" in frame) || !frame.image}
            message={getErrorMessageFromFramesStackItem(currentFrameStackItem)}
            variant={
              currentFrameStackItem.type === "error" ? "error" : "message"
            }
          />
        ) : null}
        {!!frame && !!frame.image && (
          <ImageEl
            src={debugImage ?? frame.image}
            key={debugImage ?? frame.image}
            alt="Frame image"
            width="100%"
            style={{
              filter: isLoading ? "blur(4px)" : undefined,
              borderTopLeftRadius: `${resolvedTheme.buttonRadius}px`,
              borderTopRightRadius: `${resolvedTheme.buttonRadius}px`,
              border: `1px solid ${resolvedTheme.buttonBorderColor}`,
              objectFit: "cover",
              width: "100%",
              aspectRatio:
                (frame.imageAspectRatio ?? "1.91:1") === "1:1"
                  ? "1/1"
                  : "1.91/1",
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
      {!!frame && frame.inputText ? (
        <input
          className="p-[6px] mx-2 border box-border"
          style={{
            borderRadius: `${resolvedTheme.buttonRadius}px`,
            borderColor: `${resolvedTheme.buttonBorderColor}`,
          }}
          value={frameState.inputText}
          type="text"
          placeholder={frame.inputText}
          onChange={(e) => {
            frameState.setInputText(e.target.value);
          }}
        />
      ) : null}
      {!!parseResult &&
      !!specification &&
      !!frame &&
      !!frame.buttons &&
      frame.buttons.length > 0 ? (
        <div className="flex gap-[8px] px-2 pb-2">
          {frame.buttons.map((frameButton: FrameButton, index: number) => (
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
                  frameState.onButtonPress({
                    parseResult,
                    frameButton,
                    index,
                    specification,
                  })
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
