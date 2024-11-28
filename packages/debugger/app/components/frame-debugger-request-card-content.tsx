import type { UseFrameReturnValue } from "@frames.js/render/unstable-types";
import type {
  DebuggerFrameStack,
  DebuggerFrameStackItem,
} from "../hooks/useDebuggerFrameState";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  InfoIcon,
  LoaderIcon,
  XCircleIcon,
} from "lucide-react";
import { hasWarnings } from "../lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { urlSearchParamsToObject } from "../utils/url-search-params-to-object";

type FrameDebuggerRequestCardContentProps = {
  stack: DebuggerFrameStack;
  fetchFrame: UseFrameReturnValue["fetchFrame"];
};

export function FrameDebuggerRequestCardContent({
  fetchFrame,
  stack,
}: FrameDebuggerRequestCardContentProps) {
  return stack.map((frameStackItem, i) => {
    return (
      <button
        className={`px-4 py-3 flex flex-col gap-2 ${
          i !== 0 ? "border-t" : "bg-slate-50"
        } hover:bg-slate-50 w-full`}
        key={i}
        onClick={() => {
          fetchFrame(frameStackItem.request);
        }}
      >
        <span className="flex text-left flex-row w-full">
          <span className="border text-gray-500 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
            {frameStackItem.request.method}
          </span>
          <span className="border text-gray-500 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
            {new URL(frameStackItem.url).protocol}
            {"//"}
            {new URL(frameStackItem.url).hostname}
            {new URL(frameStackItem.url).port
              ? `:${new URL(frameStackItem.url).port}`
              : ""}
          </span>
          <span className="ml-auto">
            <FramesRequestCardContentIcon
              stackItem={frameStackItem}
            ></FramesRequestCardContentIcon>
          </span>
        </span>
        <span className="flex flex-row w-full">
          <span className="text-left line-clamp-2 text-ellipsis overflow-hidden break-words">
            {new URL(frameStackItem.url).pathname}
          </span>
          <span className="ml-auto" suppressHydrationWarning>
            {frameStackItem.extra.timestamp.toLocaleTimeString()}
          </span>
        </span>
        <div>
          {Array.from(new URL(frameStackItem.url).searchParams.entries())
            .length ? (
            <HoverCard>
              <HoverCardTrigger>
                <span className="border text-gray-500 text-xs font-medium me-2 p-1 cursor-pointer rounded dark:bg-gray-700 dark:text-gray-300">
                  ?params
                </span>
              </HoverCardTrigger>
              <HoverCardContent>
                <pre
                  id="json"
                  className="font-mono text-xs text-left"
                  style={{
                    padding: "10px",
                    borderRadius: "4px",
                  }}
                >
                  {JSON.stringify(
                    urlSearchParamsToObject(
                      new URL(frameStackItem.url).searchParams
                    ),
                    null,
                    2
                  )}
                </pre>
              </HoverCardContent>
            </HoverCard>
          ) : null}
        </div>
      </button>
    );
  });
}

const FramesRequestCardContentIcon: React.FC<{
  stackItem: DebuggerFrameStackItem;
}> = ({ stackItem }) => {
  if (stackItem.status === "pending") {
    return <LoaderIcon className="animate-spin" size={20} />;
  }

  if (stackItem.status === "requestError") {
    return <XCircleIcon size={20} color="red" />;
  }

  if (stackItem.status === "message") {
    if (stackItem.type === "info") {
      return <InfoIcon size={20} color="blue" />;
    } else {
      return <XCircleIcon size={20} color="red" />;
    }
  }

  if (stackItem.status === "doneRedirect") {
    return <ExternalLinkIcon size={20} color="green" />;
  }

  if (stackItem.frameResult?.status === "failure") {
    return <XCircleIcon size={20} color="red" />;
  }

  if (hasWarnings(stackItem.frameResult.reports)) {
    return <AlertTriangleIcon size={20} color="orange" />;
  }

  return <CheckCircle2Icon size={20} color="green" />;
};
