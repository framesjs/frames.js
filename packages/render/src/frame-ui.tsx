import type { ImgHTMLAttributes } from "react";
import React, { useEffect, useState } from "react";
import type { FrameButton } from "frames.js";
import type { FrameTheme, FrameState } from "./types";

export const defaultTheme: Required<FrameTheme> = {
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

export type FrameUIProps = {
  frameState: FrameState;
  theme?: FrameTheme;
  FrameImage?: React.FC<ImgHTMLAttributes<HTMLImageElement> & { src: string }>;
};

/** A UI component only, that should be easy for any app to integrate */
export function FrameUI({
  frameState,
  theme,
  FrameImage,
}: FrameUIProps): React.JSX.Element | null {
  const [isImageLoading, setIsImageLoading] = useState(true);

  const isLoading = !!frameState.isLoading || isImageLoading;

  useEffect(() => {
    if (frameState.frame?.image) setIsImageLoading(true);
  }, [frameState]);

  const resolvedTheme = getThemeWithDefaults(theme ?? {});
  if (!frameState.homeframeUrl) return <div>Missing frame url</div>;
  if (frameState.error) {
    return <div>Failed to load Frame</div>;
  }
  if (frameState.homeframeUrl && !frameState.frame && !frameState.isLoading)
    return <div>Failed to load Frame</div>;
  if (!frameState.frame) return null;
  if (!frameState.isFrameValid) return <div>Invalid frame</div>;

  const ImageEl = FrameImage ? FrameImage : "img";
  return (
    <div
      style={{ backgroundColor: resolvedTheme.bg }}
      className="flex flex-col w-full gap-2 rounded-br rounded-bl"
    >
      <ImageEl
        src={frameState.frame.image}
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
            (frameState.frame.imageAspectRatio ?? "1.91:1") === "1:1"
              ? "1/1"
              : "1.91/1",
        }}
        onLoad={() => {
          setIsImageLoading(false);
        }}
        onError={() => {
          setIsImageLoading(false);
        }}
      />
      {frameState.frame.inputText ? (
        <input
          className="p-[6px] mx-2 border box-border"
          style={{
            borderRadius: `${resolvedTheme.buttonRadius}px`,
            borderColor: `${resolvedTheme.buttonBorderColor}`,
          }}
          value={frameState.inputText}
          type="text"
          placeholder={frameState.frame.inputText}
          onChange={(e) => {
            frameState.setInputText(e.target.value);
          }}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "8px",
        }}
        className="px-2 pb-2"
      >
        {frameState.frame.buttons?.map(
          (frameButton: FrameButton, index: number) => (
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
                Promise.resolve(frameState.onButtonPress(frameButton, index)).catch((e: unknown) => {
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
          )
        )}
      </div>
    </div>
  );
}
