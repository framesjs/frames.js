import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { FrameUI as BaseFrameUI } from "@frames.js/render/ui";
import { ZapIcon } from "lucide-react";
import Image from "next/image";
import defaultImageLoader from "next/dist/shared/lib/image-loader";
import React from "react";
import type { ImageLoaderProps } from "next/dist/shared/lib/image-config";

type Props = Omit<
  React.ComponentProps<
    typeof BaseFrameUI<{ className?: string; style?: React.CSSProperties }>
  >,
  "onMessage"
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
    // we use onMessage to render a toast instead
    return null;
  },
  MessageTooltip(props, stylingProps) {
    // we use onMessage to render a toast instead
    return null;
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

    /**
     * Because of how browsers behave we want to force browser to reload the dynamic image on each render
     * but for the rest of images we want default behaviour.
     */
    const url = new URL(props.src);
    const isDynamicUrl =
      url.searchParams.has("url") && !url.searchParams.has("jsx");

    const loader = (loaderProps: ImageLoaderProps) => {
      /**
       * This is debugger specific loader. We need that because dynamic images have static URL
       * and browser will not reload the url if it already has been rendered.
       *
       * The beautiful thing about this is that internally the cache headers of dynamic image are respected
       * because next.js caches them.
       */
      return `${defaultImageLoader(loaderProps as any)}&_id=${props.frameState.id}`;
    };

    // this is necessary for nextjs so it passes config to default image loader
    loader.__next_img_default = true;

    return (
      <Image
        {...stylingProps}
        loader={isDynamicUrl ? loader : undefined}
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
    style: {
      aspectRatio: "var(--frame-image-aspect-ratio)", // fixed loading skeleton size
    },
  },
  TextInput: {
    className: "p-[6px] border rounded border-gray-300 box-border w-full",
  },
  TextInputContainer: {
    className: "w-full px-2",
  },
};

export function FrameUI(props: Props) {
  const { toast } = useToast();

  return (
    <BaseFrameUI
      {...props}
      components={components}
      theme={theme}
      onMessage={(message) => {
        toast({
          description: message.message,
          variant: message.status === "error" ? "destructive" : "default",
        });
      }}
    />
  );
}
