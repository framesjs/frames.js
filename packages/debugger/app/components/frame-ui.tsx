import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FrameUI as BaseFrameUI } from "@frames.js/render/ui";
import { MessageSquareIcon, AlertOctagonIcon, ZapIcon } from "lucide-react";
import Image from "next/image";
import React from "react";

type Props = React.ComponentProps<
  typeof BaseFrameUI<{ className?: string; style?: React.CSSProperties }>
>;

const components: Props["components"] = {
  Button(
    { frameButton, isDisabled, onPress, index, frameState },
    stylingProps
  ) {
    return (
      <button
        {...stylingProps}
        key={index}
        className={cn(
          "border text-sm text-gray-700 rounded flex-1 bg-white border-gray-300 p-2",
          (frameState.status === "loading" || frameState.isImageLoading) &&
            "bg-gray-100 cursor-default",
          stylingProps.className
        )}
        disabled={isDisabled}
        onClick={onPress}
        type="button"
      >
        {frameButton.action === "mint" ? `⬗ ` : ""}
        {frameButton.label}
        {frameButton.action === "tx" ? (
          <ZapIcon
            className="ml-1 mb-[2px] text-gray-400 inline-block select-none align-text-middle overflow-visible"
            fill="currentColor"
            size={12}
          />
        ) : (
          ""
        )}
        {frameButton.action === "post_redirect" || frameButton.action === "link"
          ? ` ↗`
          : ""}
      </button>
    );
  },
  Message(props, stylingProps) {
    return (
      <div
        {...stylingProps}
        className={cn(
          "p-2 text-sm text-gray-700 border border-gray-300 rounded-md shadow-md bg-white",
          props.status === "error" && "border-red-500 text-red-500",
          stylingProps.className
        )}
      >
        {props.message}
      </div>
    );
  },
  MessageTooltip(props, stylingProps) {
    return (
      <div
        {...stylingProps}
        className={cn(
          "absolute bottom-2 border border-slate-100 rounded-sm shadow-md inset-x-2 bg-white",
          "items-center p-2 flex gap-2 text-sm",
          props.status === "error" && "text-red-500",
          stylingProps.className
        )}
      >
        {props.status === "error" ? (
          <AlertOctagonIcon />
        ) : (
          <MessageSquareIcon />
        )}
        {props.message}
      </div>
    );
  },
  LoadingScreen(props, stylingProps) {
    return (
      <div {...stylingProps}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  },
  Image(props, stylingProps) {
    if (props.status === "frame-loading") {
      return <div />;
    }

    return (
      <Image
        {...stylingProps}
        src={props.src}
        onLoad={props.onImageLoadEnd}
        onError={props.onImageLoadEnd}
        alt="Frame image"
        sizes="100vw"
        height={0}
        width={0}
      />
    );
  },
};

const theme: Props["theme"] = {
  ButtonsContainer: {
    className: "flex gap-[8px] px-2 pb-2 bg-white",
  },
  Root: {
    className:
      "flex flex-col w-full gap-2 border rounded-lg overflow-hidden bg-white relative",
  },
  Error: {
    className:
      "flex text-red-500 text-sm p-2 bg-white border border-red-500 rounded-md shadow-md aspect-square justify-center items-center",
  },
  LoadingScreen: {
    className: "absolute top-0 left-0 right-0 bottom-0 bg-gray-300 z-10",
  },
  Image: {
    className: "w-full object-cover max-h-full",
  },
  ImageContainer: {
    className:
      "relative w-full h-full border-b border-gray-300 overflow-hidden",
  },
  TextInput: {
    className: "p-[6px] border rounded border-gray-300 box-border w-full",
  },
  TextInputContainer: {
    className: "w-full px-2",
  },
};

export function FrameUI(props: Props) {
  return <BaseFrameUI {...props} components={components} theme={theme} />;
}
