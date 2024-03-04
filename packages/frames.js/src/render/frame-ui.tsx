import { FrameTheme, FrameState } from "./types";
import React, { ImgHTMLAttributes } from "react";
import { FrameButton } from "..";

export const defaultTheme: Required<FrameTheme> = {
  buttonBg: "#fff",
  buttonBorderColor: "#ccc",
  buttonHoverBg: "#efefef",
  buttonColor: "#444",
  buttonRadius: "4",
  bg: "#efefef",
};

const getThemeWithDefaults = (theme: FrameTheme) => {
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
export function FrameUI({ frameState, theme, FrameImage }: FrameUIProps) {
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
        width={"100%"}
        style={{
          filter: frameState.isLoading ? "blur(4px)" : undefined,
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
      />
      {frameState.frame.inputText && (
        <input
          className="p-[6px] mx-2 border box-border"
          style={{
            borderRadius: `${resolvedTheme.buttonRadius}px`,
            borderColor: `${resolvedTheme.buttonBorderColor}`,
          }}
          type="text"
          placeholder={frameState.frame.inputText}
          onChange={(e) => frameState.setInputText(e.target.value)}
        />
      )}
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
              disabled={!!frameState.isLoading}
              className={`p-2 ${
                frameState.isLoading ? "bg-gray-100" : ""
              } border text-sm text-gray-800 rounded`}
              style={{
                flex: "1 1 0px",
                // fixme: hover style
                backgroundColor: resolvedTheme.buttonBg,
                borderColor: resolvedTheme.buttonBorderColor,
                color: resolvedTheme.buttonColor,
                cursor: frameState.isLoading ? undefined : "pointer",
              }}
              onClick={() => frameState.onButtonPress(frameButton, index)}
              key={index}
            >
              {frameButton.action === "mint" ? `⬗ ` : ""}
              {frameButton.label}
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
