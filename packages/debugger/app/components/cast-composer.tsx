import type {
  ComposerActionResponse,
  ComposerActionState,
} from "frames.js/types";
import React, { useCallback, useImperativeHandle, useState } from "react";
import {
  BugPlayIcon,
  CircleXIcon,
  LoaderCircleIcon,
  GlobeIcon,
} from "lucide-react";
import IconByName from "./octicons";
import { useFrame } from "@frames.js/render/use-frame";
import { WithTooltip } from "./with-tooltip";
import type { StoredIdentity } from "../hooks/use-farcaster-identity";
import type {
  FarcasterFrameContext,
  FrameActionBodyPayload,
  FrameStackDone,
} from "@frames.js/render";
import { FrameUI } from "./frame-ui";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@radix-ui/react-toast";

type CastComposerProps = {
  composerAction: Partial<ComposerActionResponse>;
  onComposerActionClick: (state: ComposerActionState) => any;
  farcasterFrameConfig: Parameters<
    typeof useFrame<
      StoredIdentity | null,
      FrameActionBodyPayload,
      FarcasterFrameContext
    >
  >[0];
};

export type CastComposerRef = {
  updateState(newState: ComposerActionState): void;
};

export const CastComposer = React.forwardRef<
  CastComposerRef,
  CastComposerProps
>(({ composerAction, farcasterFrameConfig, onComposerActionClick }, ref) => {
  const [state, setState] = useState<ComposerActionState>({
    text: "",
    embeds: [],
  });

  useImperativeHandle(
    ref,
    () => ({
      updateState(newState) {
        setState(newState);
      },
    }),
    []
  );

  // render only first 2 embeds but allow more embeds in cast because that's exactly how warpcast playground works
  return (
    <form className="w-full flex flex-col gap-2">
      <textarea
        className="resize-none p-2"
        name="text"
        onChange={(e) => {
          const text = e.currentTarget.value;

          setState((val) => ({ ...val, text }));
        }}
        placeholder="Type a cast here and then click on action button..."
        value={state.text}
        rows={2}
      />
      {state.embeds.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {state.embeds.slice(0, 2).map((embed, index) => (
            <li key={`${embed}-${index}`}>
              <CastEmbedPreview
                farcasterFrameConfig={farcasterFrameConfig}
                onRemove={() => {
                  const filteredEmbeds = state.embeds.filter(
                    (_, i) => i !== index
                  );

                  setState({
                    text: state.text,
                    embeds: filteredEmbeds,
                  });
                }}
                url={embed}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <div>
        <button
          className="px-4 py-2 rounded-md hover:bg-slate-100"
          title={composerAction.name}
          type="button"
          onClick={() => {
            onComposerActionClick(state);
          }}
        >
          <IconByName
            iconName={composerAction.icon ?? "alert"}
            size={17}
            fill="#64748B"
          />
        </button>
      </div>
    </form>
  );
});

CastComposer.displayName = "CastComposer";

type CastEmbedPreviewProps = {
  farcasterFrameConfig: Parameters<
    typeof useFrame<
      StoredIdentity | null,
      FrameActionBodyPayload,
      FarcasterFrameContext
    >
  >[0];
  url: string;
  onRemove: () => void;
};

function createDebugUrl(frameUrl: string, currentUrl: string) {
  const debugUrl = new URL("/", currentUrl);

  debugUrl.searchParams.set("url", frameUrl);

  return debugUrl.toString();
}

function isAtLeastPartialFrame(stackItem: FrameStackDone): boolean {
  return (
    stackItem.frameResult.status === "success" ||
    (!!stackItem.frameResult.frame &&
      !!stackItem.frameResult.frame.buttons &&
      stackItem.frameResult.frame.buttons.length > 0)
  );
}

function CastEmbedPreview({
  farcasterFrameConfig,
  onRemove,
  url,
}: CastEmbedPreviewProps) {
  const { toast } = useToast();
  const frame = useFrame({
    ...farcasterFrameConfig,
    homeframeUrl: url,
  });

  const handleFrameError = useCallback(
    (e: Error) => {
      toast({
        title: "Unexpected error",
        description:
          "Please check the console for more information or debug the frame",
        variant: "destructive",
        action: (
          <ToastAction
            altText="Debug"
            onClick={() => {
              window
                .open(createDebugUrl(url, window.location.href), "_blank")
                ?.focus();
            }}
          >
            Debug
          </ToastAction>
        ),
      });
      console.error(e);
    },
    [toast, url]
  );

  if (frame.currentFrameStackItem?.status === "pending") {
    return (
      <span className="flex gap-2 w-full items-center">
        <LoaderCircleIcon className="animate-spin flex-shrink-0" aria-hidden />
        <span className="truncate text-sm text-slate-400">{url}</span>
      </span>
    );
  }

  if (
    frame.currentFrameStackItem?.status === "done" &&
    isAtLeastPartialFrame(frame.currentFrameStackItem)
  ) {
    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex gap-2 ml-auto mr-2 text-slate-300">
          <WithTooltip tooltip="Open in debugger">
            <button
              className="hover:text-slate-400"
              onClick={() => {
                window
                  .open(createDebugUrl(url, window.location.href), "_blank")
                  ?.focus();
              }}
              type="button"
            >
              <BugPlayIcon />
            </button>
          </WithTooltip>
          <WithTooltip tooltip="Remove">
            <button
              className="hover:text-slate-400"
              onClick={() => onRemove()}
              type="button"
            >
              <CircleXIcon />
            </button>
          </WithTooltip>
        </div>
        <FrameUI
          frameState={frame}
          allowPartialFrame
          onError={handleFrameError}
        />
        <span className="ml-auto truncate text-sm text-slate-400">{url}</span>
      </div>
    );
  }

  return (
    <span className="flex gap-2 w-full items-center">
      <div className="flex flex-grow items-center gap-4 bg-slate-100 p-2 rounded">
        <div className="bg-slate-200 rounded p-4">
          <GlobeIcon className="flex-shrink-0" />
        </div>
        <span className="truncate text-sm text-slate-800 flex-grow">{url}</span>
        <div className="flex gap-2">
          <WithTooltip tooltip="Open in debugger">
            <button
              className="flex-shrink-0"
              onClick={() => {
                window
                  .open(createDebugUrl(url, window.location.href), "_blank")
                  ?.focus();
              }}
              type="button"
            >
              <BugPlayIcon />
            </button>
          </WithTooltip>
          <WithTooltip tooltip="Remove">
            <button
              className="flex-shrink-0"
              onClick={() => onRemove()}
              type="button"
            >
              <CircleXIcon />
            </button>
          </WithTooltip>
        </div>
      </div>
    </span>
  );
}
