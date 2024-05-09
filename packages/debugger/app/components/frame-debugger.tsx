import {
  getFrameHtmlHead,
  getFrameFlattened,
  ParsingReport,
  SupportedParsingSpecification,
  type FrameFlattened,
} from "frames.js";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import React from "react";
import {
  type FrameState,
  type FramesStack,
  type FramesStackItem,
  FrameUI,
  defaultTheme,
} from "@frames.js/render";
import { FrameImageNext } from "@frames.js/render/next";
import { Table, TableBody, TableCell, TableRow } from "@/components/table";
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
import {
  InvalidImageAspectRatioError,
  validateFrameImage,
} from "../lib/validateFrameImage";

type FrameDebuggerFramePropertiesTableRowsProps = {
  stackItem: FramesStackItem;
  specification: SupportedParsingSpecification;
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

function FrameDebuggerFramePropertiesTableRow({
  stackItem,
  specification,
}: FrameDebuggerFramePropertiesTableRowsProps) {
  const [currentStackItem, setCurrentStackItem] = useState(stackItem);
  const properties = useMemo(() => {
    /** tuple of key and value */
    const validProperties: [string, string][] = [];
    /** tuple of key and error message */
    const invalidProperties: [string, ParsingReport[]][] = [];
    const visitedInvalidProperties: string[] = [];

    if (currentStackItem.status === "pending") {
      return { validProperties, invalidProperties, isValid: true };
    }

    if (currentStackItem.status === "requestError") {
      return { validProperties, invalidProperties, isValid: false };
    }

    if (currentStackItem.status === "message") {
      return { validProperties, invalidProperties, isValid: true };
    }

    const result = currentStackItem.frame;

    // we need to check validation errors first because getFrame incorrectly return a value for a key even if it's invalid
    for (const [key, errors] of Object.entries(result.reports)) {
      invalidProperties.push([key, errors.filter((e) => e.level === "error")]);
      if (errors.filter((e) => e.level === "error").length > 0)
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
  }, [currentStackItem]);

  useEffect(() => {
    setCurrentStackItem(stackItem);
  }, [stackItem]);

  useEffect(() => {
    if (stackItem.status === "done" && stackItem.frame.frame.image) {
      const imageKey: keyof FrameFlattened =
        specification === "farcaster" ? "fc:frame:image" : "of:image";
      const imageAspectRatioKey: keyof FrameFlattened =
        specification === "farcaster"
          ? "fc:frame:image:aspect_ratio"
          : "of:image:aspect_ratio";

      const src = stackItem.frame.frame.image;

      validateFrameImage({
        src,
        aspectRatio: stackItem.frame.frame.imageAspectRatio ?? "1.91:1",
      }).catch((e) => {
        if (e instanceof InvalidImageAspectRatioError) {
          setCurrentStackItem({
            ...stackItem,
            frame: {
              ...stackItem.frame,
              status: "failure",
              reports: {
                ...stackItem.frame.reports,
                [imageAspectRatioKey]: [
                  ...(stackItem.frame.reports[imageAspectRatioKey] ?? []),
                  {
                    source: specification,
                    level: "error",
                    message: e.message,
                  },
                ],
              },
            },
          });
        } else {
          setCurrentStackItem({
            ...stackItem,
            frame: {
              ...stackItem.frame,
              status: "failure",
              reports: {
                ...stackItem.frame.reports,
                [imageKey]: [
                  ...(stackItem.frame.reports[imageKey] ?? []),
                  {
                    source: specification,
                    level: "error",
                    message:
                      e instanceof Error
                        ? e.message
                        : `Failed to load image, invalid file type or corrupted image file`,
                  },
                ],
              },
            },
          });
        }
      });
    }
  }, [stackItem, specification]);

  return (
    <>
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
      {properties.invalidProperties.flatMap(([propertyKey, errorMessages]) => {
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
      })}
      {properties.hasExperimentalProperties && (
        <TableRow>
          <TableCell colSpan={3} className="text-slate-500">
            *This property is experimental and may not have been adopted in
            clients yet
          </TableCell>
        </TableRow>
      )}
    </>
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

  if (stackItem.frame?.status === "failure") {
    return <XCircle size={20} color="red" />;
  }

  if (hasWarnings(stackItem.frame.reports)) {
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
          fetchFrame(
            frameStackItem.method === "GET"
              ? {
                  method: "GET",
                  url: frameStackItem.url,
                }
              : {
                  url: frameStackItem.url,
                  method: frameStackItem.method,
                  request: frameStackItem.request,
                  sourceFrame: frameStackItem.sourceFrame,
                }
          );
        }}
      >
        <span className="flex text-left flex-row w-full">
          <span className="border text-gray-500 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
            {frameStackItem.method}
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

export function FrameDebugger({
  specification,
  url,
  frameState,
  mockHubContext,
  setMockHubContext,
}: {
  specification: SupportedParsingSpecification;
  frameState: FrameState;
  url: string;
  mockHubContext?: Partial<MockHubActionContext>;
  setMockHubContext?: Dispatch<SetStateAction<Partial<MockHubActionContext>>>;
}) {
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

  const [latestFrame] = frameState.framesStack;

  const isLoading = frameState.frame?.status === "pending";

  useEffect(() => {
    if (!isLoading) {
      // make sure the first frame is open
      if (!openAccordions.includes(String(latestFrame?.timestamp.getTime())))
        setOpenAccordions((v) => [
          ...v,
          String(latestFrame?.timestamp.getTime()),
        ]);
    }
  }, [isLoading, latestFrame?.timestamp, openAccordions]);

  const frameResult =
    latestFrame?.status === "done" ? latestFrame.frame : undefined;

  return (
    <div className="flex flex-row items-start p-4 gap-4 bg-slate-50 max-w-full w-full h-full">
      <div className="flex flex-col gap-4 w-[300px] min-w-[300px]">
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
                const [latestFrame] = frameState.framesStack;

                if (latestFrame) {
                  frameState.fetchFrame(
                    latestFrame.method === "GET"
                      ? {
                          method: "GET",
                          url: latestFrame.url,
                        }
                      : {
                          method: "POST",
                          request: latestFrame.request,
                          url: latestFrame.url,
                          sourceFrame: latestFrame.sourceFrame,
                        }
                  );
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
      <div className="flex flex-col gap-4 w-[500px] min-w-[500px]">
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
                {frameState.frame?.status === "done" &&
                  frameState.frame.frame.frame.buttons
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

        {frameState.framesStack.length !== 0 ? (
          <Card>
            <CardContent className="px-5 py-5 w-full overflow-x-auto">
              <Tabs defaultValue="action" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="action">Action</TabsTrigger>
                  <TabsTrigger value="state">Frames.js</TabsTrigger>
                  <TabsTrigger value="frame">Frame</TabsTrigger>
                  <TabsTrigger value="query">Params</TabsTrigger>
                  <TabsTrigger value="meta">Tags</TabsTrigger>
                </TabsList>
                <TabsContent value="action">
                  <b className="block">Previous Action</b>
                  <pre
                    id="json"
                    className="font-mono text-xs"
                    style={{
                      padding: "10px",
                      borderRadius: "4px",
                    }}
                  >
                    {frameState.framesStack[0]?.method === "GET"
                      ? "none"
                      : JSON.stringify(
                          frameState.framesStack[0]?.request.body,
                          null,
                          2
                        )}
                  </pre>
                </TabsContent>
                <TabsContent value="state">
                  <b className="block">Previous Frames.js Reducer State</b>
                  <pre
                    id="json"
                    className="font-mono text-xs"
                    style={{
                      padding: "10px",
                      borderRadius: "4px",
                    }}
                  >
                    {frameState.framesStack[0]?.method === "GET"
                      ? "none"
                      : JSON.stringify(
                          (
                            paramsToObject(
                              new URL(
                                frameState.framesStack[0]!.url
                              ).searchParams.entries()
                            ) as any
                          ).s,
                          null,
                          2
                        )}
                  </pre>
                </TabsContent>
                <TabsContent value="query">
                  <span className="font-bold">
                    URL query params (may be generated by frames.js)
                  </span>
                  {Array.from(
                    new URL(
                      frameState.framesStack[0]!.url
                    ).searchParams.entries()
                  ).length ? (
                    <pre
                      id="json"
                      className="font-mono text-xs"
                      style={{
                        padding: "10px",
                        borderRadius: "4px",
                      }}
                    >
                      {JSON.stringify(
                        paramsToObject(
                          new URL(
                            frameState.framesStack[0]!.url
                          ).searchParams.entries()
                        ),
                        null,
                        2
                      )}
                    </pre>
                  ) : (
                    "None"
                  )}
                </TabsContent>
                <TabsContent value="meta">
                  {frameResult?.status === "success" ? (
                    <div className="py-4 flex-1">
                      <span className="font-bold">html tags</span>
                      <button
                        className="underline"
                        onClick={() => {
                          // Copy the text inside the text field
                          navigator.clipboard.writeText(
                            getFrameHtmlHead(frameResult.frame)
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
                        {getFrameHtmlHead(frameResult.frame)
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
                <TabsContent value="frame">
                  <pre id="json" className="font-mono text-xs p-2">
                    {JSON.stringify(
                      "frame" in frameState.framesStack[0]!
                        ? frameState.framesStack[0]!.frame
                        : undefined,
                      null,
                      2
                    )}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : null}
      </div>
      <div className="flex flex-row gap-4 w-full">
        <div className="h-full min-w-0 w-full">
          {frameState.frame && frameState.frame?.status !== "pending" ? (
            <Card>
              <CardContent className="p-0">
                <div className="px-2">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          {frameState.frame.speed > 5 ? (
                            <XCircle size={20} color="red" />
                          ) : frameState.frame.speed > 4 ? (
                            <AlertTriangle size={20} color="orange" />
                          ) : (
                            <CheckCircle2 size={20} color="green" />
                          )}
                        </TableCell>
                        <TableCell>frame speed</TableCell>
                        <TableCell className="text-slate-500">
                          {frameState.frame.speed > 5
                            ? `Request took more than 5s (${frameState.frame.speed} seconds). This may be normal: first request will take longer in development (as next.js builds), but in production, clients will timeout requests after 5s`
                            : frameState.frame.speed > 4
                              ? `Warning: Request took more than 4s (${frameState.frame.speed} seconds). Requests will fail at 5s. This may be normal: first request will take longer in development (as next.js builds), but in production, if there's variance here, requests could fail in production if over 5s`
                              : `${frameState.frame.speed} seconds`}
                        </TableCell>
                      </TableRow>
                      <FrameDebuggerFramePropertiesTableRow
                        specification={specification}
                        stackItem={frameState.frame}
                      ></FrameDebuggerFramePropertiesTableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
