import {
  getFrameHtmlHead,
  getFrameFlattened,
  ParsingReport,
  SupportedParsingSpecification,
} from "frames.js";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import React from "react";
import {
  type FrameState,
  type FramesStack,
  type FramesStackItem,
  FrameUI,
  defaultTheme,
} from "@frames.js/render";
import { FrameImageNext } from "@frames.js/render/next";
import { JSONTree } from "react-json-tree";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/table";
import {
  AlertTriangle,
  BanIcon,
  CheckCircle2,
  HomeIcon,
  InfoIcon,
  LayoutGridIcon,
  ListIcon,
  LoaderIcon,
  MessageCircleHeart,
  RefreshCwIcon,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MockHubConfig } from "./mock-hub-config";
import { MockHubActionContext } from "../utils/mock-hub-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { hasWarnings } from "../lib/utils";
import { useRouter } from "next/navigation";
import { WithTooltip } from "./with-tooltip";
import { DebuggerConsole } from "./debugger-console";

type FrameDiagnosticsProps = {
  stackItem: FramesStackItem;
};

function paramsToObject(entries: IterableIterator<[string, string]>): object {
  const result: Record<string, any> = {};
  for (const [key, value] of entries) {
    // each 'entry' is a [key, value] tupple
    if (value.startsWith("{")) {
      try {
        result[key] = JSON.parse(value);
        continue;
      } catch (err) {}
    }
    result[key] = value;
  }
  return result;
}

function isPropertyExperimental([key, value]: [string, string]) {
  // tx is experimental
  return false;
}

function FrameDiagnostics({ stackItem }: FrameDiagnosticsProps) {
  const properties = useMemo(() => {
    /** tuple of key and value */
    const validProperties: [string, string][] = [];
    /** tuple of key and error message */
    const invalidProperties: [string, ParsingReport[]][] = [];
    const visitedInvalidProperties: string[] = [];

    if (stackItem.status === "pending") {
      return { validProperties, invalidProperties, isValid: true };
    }

    if (stackItem.status === "requestError") {
      return { validProperties, invalidProperties, isValid: false };
    }

    if (stackItem.status === "message") {
      return { validProperties, invalidProperties, isValid: true };
    }

    const result = stackItem.frameResult;

    // we need to check validation errors first because getFrame incorrectly return a value for a key even if it's invalid
    for (const [key, reports] of Object.entries(result.reports)) {
      invalidProperties.push([key, reports]);
      visitedInvalidProperties.push(key);
    }

    const flattenedFrame = getFrameFlattened(result.frame, {
      "frames.js:version":
        "frames.js:version" in result.frame &&
        typeof result.frame["frames.js:version"] === "string"
          ? result.frame["frames.js:version"]
          : undefined,
    });

    if (result.framesVersion) {
      validProperties.push(["frames.js:version", result.framesVersion]);
    }

    let hasExperimentalProperties = false;

    for (const [key, value] of Object.entries(flattenedFrame)) {
      hasExperimentalProperties =
        hasExperimentalProperties || isPropertyExperimental([key, value ?? ""]);
      // skip if the key is already set as invalid or value is undefined / null
      if (visitedInvalidProperties.includes(key) || value == null) {
        continue;
      }

      validProperties.push([key, value]);
    }

    return {
      validProperties,
      invalidProperties,
      isValid: invalidProperties.length === 0,
      hasExperimentalProperties,
    };
  }, [stackItem]);

  if (stackItem.status === "pending") {
    return null;
  }

  return (
    <Table>
      <TableBody>
        <TableRow>
          <TableCell>
            {stackItem.speed > 5 ? (
              <XCircle size={20} color="red" />
            ) : stackItem.speed > 4 ? (
              <AlertTriangle size={20} color="orange" />
            ) : (
              <CheckCircle2 size={20} color="green" />
            )}
          </TableCell>
          <TableCell>frame speed</TableCell>
          <TableCell className="text-slate-500">
            {stackItem.speed > 5
              ? `Request took more than 5s (${stackItem.speed} seconds). This may be normal: first request will take longer in development (as next.js builds), but in production, clients will timeout requests after 5s`
              : stackItem.speed > 4
                ? `Warning: Request took more than 4s (${stackItem.speed} seconds). Requests will fail at 5s. This may be normal: first request will take longer in development (as next.js builds), but in production, if there's variance here, requests could fail in production if over 5s`
                : `${stackItem.speed} seconds`}
          </TableCell>
        </TableRow>
        {properties.validProperties.map(([propertyKey, value]) => {
          return (
            <TableRow key={`${propertyKey}-valid`}>
              <TableCell>
                {isPropertyExperimental([propertyKey, value]) ? (
                  <span className="whitespace-nowrap flex">
                    <div className="inline">
                      <CheckCircle2 size={20} color="orange" />
                    </div>
                    <div className="inline text-slate-500">*</div>
                  </span>
                ) : (
                  <CheckCircle2 size={20} color="green" />
                )}
              </TableCell>
              <TableCell>{propertyKey}</TableCell>
              <TableCell className="text-slate-500">
                <ShortenedText text={value} maxLength={30} />
              </TableCell>
            </TableRow>
          );
        })}
        {properties.invalidProperties.flatMap(
          ([propertyKey, errorMessages]) => {
            return errorMessages.map((errorMessage, i) => {
              return (
                <TableRow key={`${propertyKey}-${i}-invalid`}>
                  <TableCell>
                    {errorMessage.level === "error" ? (
                      <XCircle size={20} color="red" />
                    ) : (
                      <AlertTriangle size={20} color="orange" />
                    )}
                  </TableCell>
                  <TableCell>{propertyKey}</TableCell>
                  <TableCell className="text-slate-500">
                    <p
                      className={cn(
                        "font-bold",
                        errorMessage.level === "error"
                          ? "text-red-500"
                          : "text-orange-500"
                      )}
                    >
                      {errorMessage.message}
                    </p>
                  </TableCell>
                </TableRow>
              );
            });
          }
        )}
        {properties.hasExperimentalProperties && (
          <TableRow>
            <TableCell colSpan={3} className="text-slate-500">
              *This property is experimental and may not have been adopted in
              clients yet
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function ShortenedText({
  maxLength,
  text,
}: {
  maxLength: number;
  text: string;
}) {
  if (text.length < maxLength) return text;

  return (
    <HoverCard>
      <HoverCardTrigger>{text.slice(0, maxLength - 3)}...</HoverCardTrigger>
      <HoverCardContent className="break-words">{text}</HoverCardContent>
    </HoverCard>
  );
}

const FramesRequestCardContentIcon: React.FC<{
  stackItem: FramesStackItem;
}> = ({ stackItem }) => {
  if (stackItem.status === "pending") {
    return <LoaderIcon className="animate-spin" size={20} />;
  }

  if (stackItem.status === "requestError") {
    return <XCircle size={20} color="red" />;
  }

  if (stackItem.status === "message") {
    if (stackItem.type === "info") {
      return <InfoIcon size={20} color="blue" />;
    } else {
      return <XCircle size={20} color="blue" />;
    }
  }

  if (stackItem.frameResult?.status === "failure") {
    return <XCircle size={20} color="red" />;
  }

  if (hasWarnings(stackItem.frameResult.reports)) {
    return <AlertTriangle size={20} color="orange" />;
  }

  return <CheckCircle2 size={20} color="green" />;
};

const FramesRequestCardContent: React.FC<{
  stack: FramesStack;
  fetchFrame: FrameState["fetchFrame"];
}> = ({ fetchFrame, stack }) => {
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
            {frameStackItem.timestamp.toLocaleTimeString()}
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
                    paramsToObject(
                      new URL(frameStackItem.url).searchParams.entries()
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
};

type FrameDebuggerProps = {
  specification: SupportedParsingSpecification;
  frameState: FrameState;
  url: string;
  mockHubContext?: Partial<MockHubActionContext>;
  setMockHubContext?: Dispatch<SetStateAction<Partial<MockHubActionContext>>>;
};

export type FrameDebuggerRef = {
  showConsole(): void;
};

type TabValues = "diagnostics" | "console" | "request" | "meta";

export const FrameDebugger = React.forwardRef<
  FrameDebuggerRef,
  FrameDebuggerProps
>(
  (
    { specification, url, frameState, mockHubContext, setMockHubContext },
    ref
  ) => {
    const debuggerConsoleTabRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<TabValues>("diagnostics");
    const router = useRouter();
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
      if (copySuccess) {
        setTimeout(() => {
          setCopySuccess(false);
        }, 1000);
      }
    }, [copySuccess, setCopySuccess]);

    const [openAccordions, setOpenAccordions] = useState<string[]>([]);

    const { currentFrameStackItem } = frameState;

    const isLoading = currentFrameStackItem?.status === "pending";

    useEffect(() => {
      if (!isLoading) {
        // make sure the first frame is open
        if (
          !openAccordions.includes(
            String(currentFrameStackItem?.timestamp.getTime())
          )
        )
          setOpenAccordions((v) => [
            ...v,
            String(currentFrameStackItem?.timestamp.getTime()),
          ]);
      }
    }, [isLoading, currentFrameStackItem?.timestamp, openAccordions]);

    /**
     * This handles the case where the user clicks on the console button in toast, in that case he wants to scroll to the bottom
     * otherwise we should keep the scroll position as is.
     */
    const wantsToScrollConsoleToBottomRef = useRef(false);

    useImperativeHandle(
      ref,
      () => {
        return {
          showConsole() {
            wantsToScrollConsoleToBottomRef.current = true;
            setActiveTab("console");
          },
        };
      },
      []
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[300px_500px_1fr] p-4 gap-4 bg-slate-50 max-w-full w-full">
        <div className="flex flex-col gap-4 order-1 lg:order-0">
          <div className="flex flex-row gap-2">
            <WithTooltip tooltip={<p>Fetch home frame</p>}>
              <Button
                className="flex flex-row gap-3 items-center shadow-sm border"
                variant={"outline"}
                disabled={!frameState?.homeframeUrl}
                onClick={() => {
                  if (frameState?.homeframeUrl)
                    // fetch home frame again
                    frameState.fetchFrame({
                      url: frameState?.homeframeUrl,
                      method: "GET",
                    });
                }}
              >
                <HomeIcon size={20} />
              </Button>
            </WithTooltip>
            <WithTooltip tooltip={<p>Clear history and fetch home frame</p>}>
              <Button
                className="flex flex-row gap-3 items-center shadow-sm border"
                variant={"outline"}
                disabled={!frameState?.homeframeUrl}
                onClick={() => {
                  if (frameState?.homeframeUrl) {
                    frameState.clearFrameStack();
                    frameState.fetchFrame({
                      url: frameState?.homeframeUrl,
                      method: "GET",
                    });
                  }
                }}
              >
                <BanIcon size={20} />
              </Button>
            </WithTooltip>
            <WithTooltip tooltip={<p>Reload current frame</p>}>
              <Button
                className="flex flex-row gap-3 items-center shadow-sm border"
                variant={"outline"}
                onClick={() => {
                  if (currentFrameStackItem) {
                    frameState.fetchFrame(currentFrameStackItem.request);
                  }
                }}
              >
                <RefreshCwIcon size={20} />
              </Button>
            </WithTooltip>
          </div>
          <Card className="max-h-[400px] overflow-y-auto">
            <CardContent className="p-0">
              <FramesRequestCardContent
                fetchFrame={frameState.fetchFrame}
                stack={frameState.framesStack}
              ></FramesRequestCardContent>
            </CardContent>
          </Card>
          {specification === "farcaster" &&
            mockHubContext &&
            setMockHubContext && (
              <Card>
                <CardContent className="px-5">
                  <MockHubConfig
                    hubContext={mockHubContext}
                    setHubContext={setMockHubContext}
                  ></MockHubConfig>
                </CardContent>
              </Card>
            )}
          <div className="border rounded-lg shadow-sm bg-white">
            <a
              target="_blank"
              className="px-2 py-3 block"
              href="https://docs.farcaster.xyz/learn/what-is-farcaster/frames"
            >
              <span className="text-slate-400 px-2 w-9 relative text-center inline-block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="inline mb-1"
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 1000 1000"
                >
                  <path
                    fill="#64748b"
                    d="M257.778 155.556h484.444v688.889h-71.111V528.889h-.697c-7.86-87.212-81.156-155.556-170.414-155.556-89.258 0-162.554 68.344-170.414 155.556h-.697v315.556h-71.111V155.556z"
                  ></path>
                  <path
                    fill="#64748b"
                    d="M128.889 253.333l28.889 97.778h24.444v395.556c-12.273 0-22.222 9.949-22.222 22.222v26.667h-4.444c-12.273 0-22.223 9.949-22.223 22.222v26.667h248.889v-26.667c0-12.273-9.949-22.222-22.222-22.222h-4.444v-26.667c0-12.273-9.95-22.222-22.223-22.222h-26.666V253.333H128.889zM675.556 746.667c-12.273 0-22.223 9.949-22.223 22.222v26.667h-4.444c-12.273 0-22.222 9.949-22.222 22.222v26.667h248.889v-26.667c0-12.273-9.95-22.222-22.223-22.222h-4.444v-26.667c0-12.273-9.949-22.222-22.222-22.222V351.111h24.444L880 253.333H702.222v493.334h-26.666z"
                  ></path>
                </svg>
              </span>
              Farcaster Frames Docs
            </a>
            <a
              target="_blank"
              className="px-2 py-3 border-t block"
              href="https://framesjs.org"
            >
              <span className="text-slate-400 px-2 w-9 relative text-center inline-block">
                ↗
              </span>
              Frames.js documentation
            </a>
            <a
              target="_blank"
              className="px-2 py-3 border-t block"
              href="https://warpcast.com/~/compose?text=I%20have%20a%20question%20about%20%40frames!%20cc%20%40df%20%40stephancill."
            >
              <span className="text-slate-400 px-2 w-9 relative text-center inline-block bottom-[1px]">
                <MessageCircleHeart className="inline" size={16} />
              </span>
              Ask for help
            </a>
            <a
              target="_blank"
              className="px-2 py-3 border-t block"
              href="https://warpcast.com/~/developers/embeds"
            >
              <span className="text-slate-400 px-2 w-9 relative text-center inline-block bottom-[1px]">
                ⬗
              </span>
              Warpcast Frame Debugger
            </a>
            <a
              target="_blank"
              className="px-2 py-3 border-t block"
              href="https://github.com/davidfurlong/awesome-frames?tab=readme-ov-file"
            >
              <span className="text-slate-400 px-2 w-9 relative text-center inline-block bottom-[1px]">
                <ListIcon className="inline" size={16} />
              </span>
              Awesome Frames
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-4 order-0 lg:order-1">
          <div className="w-full flex flex-col gap-1" id="frame-preview">
            {isLoading ? (
              <Card>
                <CardContent className="p-0 pb-2">
                  <div className="flex flex-col space-y-2">
                    <Skeleton className="h-[260px] w-full rounded-xl rounded-b-none" />
                    <Skeleton className="h-[38px] mx-2" />
                    <Skeleton className="h-[38px] mx-2" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <FrameUI
                    frameState={frameState}
                    theme={{
                      bg: "white",
                    }}
                    FrameImage={FrameImageNext}
                    allowPartialFrame={true}
                  />
                </div>
                <div className="ml-auto text-sm text-slate-500">{url}</div>
                <div className="space-y-1">
                  {currentFrameStackItem?.status === "done" &&
                    currentFrameStackItem.frameResult.frame.buttons
                      ?.filter((button) =>
                        button.target?.startsWith(
                          "https://warpcast.com/~/add-cast-action"
                        )
                      )
                      .map((button) => {
                        // Link to debug target
                        return (
                          <button
                            key={button.target}
                            className="border text-sm text-gray-800 rounded flex p-2 w-full gap-2"
                            onClick={() => {
                              const url = new URL(button.target!);
                              const params = new URLSearchParams({
                                url: url.searchParams.get("url")!,
                              });

                              router.push(`/?${params.toString()}`);
                            }}
                            style={{
                              flex: "1 1 0px",
                              // fixme: hover style
                              backgroundColor: defaultTheme.buttonBg,
                              borderColor: defaultTheme.buttonBorderColor,
                              color: defaultTheme.buttonColor,
                              cursor: "pointer",
                            }}
                          >
                            <LayoutGridIcon size={20} />
                            <span>
                              Debug{" "}
                              <span className="font-bold">{button.label}</span>
                            </span>
                          </button>
                        );
                      })}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-row gap-4 order-2 md:col-span-2 lg:col-span-1 lg:order-2">
          {currentFrameStackItem ? (
            <Card className="w-full max-h-[600px]">
              <CardContent className="p-5 h-full">
                <Tabs
                  value={activeTab}
                  onValueChange={(value) => setActiveTab(value as TabValues)}
                  className="grid grid-rows-[auto_1fr] w-full h-full"
                >
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
                    <TabsTrigger value="console">Console</TabsTrigger>
                    <TabsTrigger value="request">Request</TabsTrigger>
                    <TabsTrigger value="meta">Meta Tags</TabsTrigger>
                  </TabsList>
                  <TabsContent className="overflow-y-auto" value="diagnostics">
                    <FrameDiagnostics
                      stackItem={currentFrameStackItem}
                    ></FrameDiagnostics>
                  </TabsContent>
                  <TabsContent
                    className="overflow-y-auto"
                    ref={debuggerConsoleTabRef}
                    value="console"
                  >
                    <DebuggerConsole
                      onMount={(element) => {
                        if (
                          wantsToScrollConsoleToBottomRef.current &&
                          debuggerConsoleTabRef.current
                        ) {
                          wantsToScrollConsoleToBottomRef.current = false;
                          debuggerConsoleTabRef.current.scrollTo(
                            0,
                            element.scrollHeight
                          );
                        }
                      }}
                    ></DebuggerConsole>
                  </TabsContent>
                  <TabsContent className="overflow-y-auto" value="request">
                    <h2 className="my-4 text-muted-foreground font-semibold text-sm">
                      Request
                    </h2>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableHead>URL</TableHead>
                          <TableCell className="w-full">
                            {currentFrameStackItem.url}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableHead>Method</TableHead>
                          <TableCell>
                            {currentFrameStackItem.request.method}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableHead>Query Params</TableHead>
                          <TableCell>
                            <JSONTree
                              data={paramsToObject(
                                new URL(
                                  currentFrameStackItem.url
                                ).searchParams.entries()
                              )}
                              invertTheme
                              theme="default"
                            ></JSONTree>
                          </TableCell>
                        </TableRow>
                        {currentFrameStackItem.request.method === "POST" ? (
                          <TableRow>
                            <TableHead>Payload</TableHead>
                            <TableCell>
                              <JSONTree
                                data={currentFrameStackItem.requestDetails.body}
                                invertTheme
                                theme="default"
                              ></JSONTree>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                    {currentFrameStackItem.status !== "pending" ? (
                      <>
                        <h2 className="my-4 text-muted-foreground font-semibold text-sm">
                          Response
                        </h2>
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableHead>Response status</TableHead>
                              <TableCell className="w-full">
                                {currentFrameStackItem.responseStatus}
                              </TableCell>
                            </TableRow>
                            {"frame" in currentFrameStackItem ? (
                              <TableRow>
                                <TableHead>Frame Response</TableHead>
                                <TableCell>
                                  <JSONTree
                                    data={currentFrameStackItem.frame}
                                    invertTheme
                                    theme="default"
                                  ></JSONTree>
                                </TableCell>
                              </TableRow>
                            ) : (
                              <TableRow>
                                <TableHead>Response</TableHead>
                                <TableCell>
                                  <JSONTree
                                    data={
                                      currentFrameStackItem.status === "message"
                                        ? {
                                            message:
                                              currentFrameStackItem.message,
                                          }
                                        : currentFrameStackItem.responseBody
                                    }
                                    theme="default"
                                    invertTheme
                                  ></JSONTree>
                                </TableCell>
                              </TableRow>
                            )}
                            {currentFrameStackItem.status === "requestError" &&
                              !!currentFrameStackItem.requestError && (
                                <TableRow>
                                  <TableHead>Error</TableHead>
                                  <TableCell>
                                    <JSONTree
                                      data={currentFrameStackItem.requestError}
                                      theme="default"
                                      invertTheme
                                    ></JSONTree>
                                  </TableCell>
                                </TableRow>
                              )}
                          </TableBody>
                        </Table>
                      </>
                    ) : null}
                  </TabsContent>
                  <TabsContent className="overflow-y-auto" value="meta">
                    {currentFrameStackItem.status === "done" ? (
                      <div className="py-4 flex-1">
                        <span className="font-bold">html tags </span>
                        <button
                          className="underline"
                          onClick={() => {
                            if (!currentFrameStackItem) {
                              return;
                            }

                            // Copy the text inside the text field
                            navigator.clipboard.writeText(
                              getFrameHtmlHead(
                                currentFrameStackItem.frameResult.frame
                              )
                            );
                            setCopySuccess(true);
                          }}
                        >
                          {copySuccess
                            ? "✔︎ copied to clipboard"
                            : "copy html tags"}
                        </button>
                        <pre
                          id="html"
                          className="text-xs"
                          style={{
                            padding: "10px",
                            borderRadius: "4px",
                          }}
                        >
                          {getFrameHtmlHead(
                            "sourceFrame" in currentFrameStackItem.request
                              ? currentFrameStackItem.request.sourceFrame
                              : currentFrameStackItem.frameResult.frame
                          )
                            .split("<meta")
                            .filter((t) => !!t)
                            // hacky...
                            .flatMap((el, i) => [
                              <span key={i}>{`<meta${el}`}</span>,
                              <br key={`br_${i}`} />,
                            ])}
                        </pre>
                      </div>
                    ) : null}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    );
  }
);

FrameDebugger.displayName = "FrameDebugger";
