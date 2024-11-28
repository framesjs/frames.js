import { getFrameHtmlHead, getFrameV2HtmlHead } from "frames.js";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import React from "react";
import { useFrame_unstable as useFrame } from "@frames.js/render/unstable-use-frame";
import {
  attribution,
  CollapsedFrameUI,
  defaultTheme,
  fallbackFrameContext,
} from "@frames.js/render";
import { FrameImageNext } from "@frames.js/render/next";
import {
  BanIcon,
  HomeIcon,
  InfoIcon,
  LayoutGridIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MockHubConfig } from "./mock-hub-config";
import type { MockHubActionContext } from "../utils/mock-hub-utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { WithTooltip } from "./with-tooltip";
import { DebuggerConsole } from "./debugger-console";
import { FrameDebuggerLinksSidebarSection } from "./frame-debugger-links-sidebar-section";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { FrameDebuggerRequestDetails } from "./frame-debugger-request-details";
import { FrameUI } from "./frame-ui";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useDebuggerFrameState } from "../hooks/useDebuggerFrameState";
import { FrameDebuggerDiagnostics } from "./frame-debugger-diagnostics";
import { FrameDebuggerRequestCardContent } from "./frame-debugger-request-card-content";
import { useSharedFrameEventHandlers } from "../hooks/useSharedFrameEventHandlers";
import { ProtocolConfiguration } from "./protocol-config-button";
import { useFarcasterIdentity } from "../hooks/useFarcasterIdentity";
import {
  useXmtpFrameContext,
  useXmtpIdentity,
} from "@frames.js/render/identity/xmtp";
import {
  useLensFrameContext,
  useLensIdentity,
} from "@frames.js/render/identity/lens";
import { useAnonymousIdentity } from "@frames.js/render/identity/anonymous";
import { useFarcasterFrameContext } from "@frames.js/render/identity/farcaster";
import { useAccount } from "wagmi";
import { zeroAddress } from "viem";
import type { ParseFramesWithReportsResult } from "frames.js/frame-parsers";

const anonymousFrameContext = {};

type FrameDebuggerProps = {
  url: string;
  mockHubContext?: Partial<MockHubActionContext>;
  setMockHubContext?: Dispatch<SetStateAction<Partial<MockHubActionContext>>>;
  hasExamples: boolean;
  protocol: ProtocolConfiguration;
  initialFrame?: ParseFramesWithReportsResult;
};

export type FrameDebuggerRef = {
  showConsole(): void;
};

type TabValues = "diagnostics" | "image" | "console" | "request" | "meta";

export const FrameDebugger = React.forwardRef<
  FrameDebuggerRef,
  FrameDebuggerProps
>(
  (
    {
      hasExamples,
      url,
      mockHubContext,
      setMockHubContext,
      protocol,
      initialFrame,
    },
    ref
  ) => {
    const account = useAccount();
    const farcasterSignerState = useFarcasterIdentity();
    const xmtpSignerState = useXmtpIdentity();
    const lensSignerState = useLensIdentity();
    const anonymousSignerState = useAnonymousIdentity();

    const farcasterFrameContext = useFarcasterFrameContext({
      fallbackContext: fallbackFrameContext,
    });

    const xmtpFrameContext = useXmtpFrameContext({
      fallbackContext: {
        conversationTopic: "test",
        participantAccountAddresses: account.address
          ? [account.address, zeroAddress]
          : [zeroAddress],
      },
    });

    const lensFrameContext = useLensFrameContext({
      fallbackContext: {
        pubId: "0x01-0x01",
      },
    });

    const sharedFrameEventHandlers = useSharedFrameEventHandlers({
      debuggerRef: null,
    });

    const frameState = useFrame({
      ...sharedFrameEventHandlers,
      frame: initialFrame,
      homeframeUrl: url,
      frameActionProxy: "/frames",
      frameGetProxy: "/frames",
      frameStateHook: useDebuggerFrameState,
      extraButtonRequestPayload: { mockData: mockHubContext },
      transactionDataSuffix:
        process.env.NEXT_PUBLIC_FARCASTER_ATTRIBUTION_FID &&
        (protocol.protocol === "farcaster" ||
          protocol.protocol === "farcaster_v2")
          ? attribution(
              parseInt(process.env.NEXT_PUBLIC_FARCASTER_ATTRIBUTION_FID)
            )
          : undefined,
      resolveSigner() {
        switch (protocol.protocol) {
          case "farcaster":
            // it creates copies of the signer which is bad because if the signer is internally
            // updated, we see only old value although the signer is updated. This is true only for public properties
            // probably getters will be better in this regard?
            return farcasterSignerState.withContext(
              farcasterFrameContext.frameContext
            );
          case "farcaster_v2":
            return farcasterSignerState.withContext(
              farcasterFrameContext.frameContext
            );
          case "xmtp":
            return xmtpSignerState.withContext(xmtpFrameContext.frameContext);
          case "lens":
            return lensSignerState.withContext(lensFrameContext.frameContext);
          case "anonymous":
            return anonymousSignerState.withContext(anonymousFrameContext);
          default:
            throw new Error(`Unknown protocol`);
        }
      },
      onError(error) {
        console.error(error);

        toast({
          title: "Error occurred",
          description: (
            <div className="space-y-2">
              <p>{error.message}</p>
              <p>Please check the console for more information</p>
            </div>
          ),
          variant: "destructive",
          action: (
            <ToastAction
              altText="Show console"
              onClick={() => {
                wantsToScrollConsoleToBottomRef.current = true;
                setActiveTab("console");
              }}
            >
              Show console
            </ToastAction>
          ),
        });
      },
    });
    const { toast } = useToast();
    const debuggerConsoleTabRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<TabValues>("diagnostics");
    const router = useRouter();
    const [copySuccess, setCopySuccess] = useState(false);
    const [imageDebuggingEnabled, setImageDebuggingEnabled] = useState(false);

    useEffect(() => {
      if (copySuccess) {
        setTimeout(() => {
          setCopySuccess(false);
        }, 1000);
      }
    }, [copySuccess, setCopySuccess]);

    const { currentFrameStackItem } = frameState;

    const isLoading = currentFrameStackItem?.status === "pending";

    /**
     * This handles the case where the user clicks on the console button in toast, in that case he wants to scroll to the bottom
     * otherwise we should keep the scroll position as is.
     */
    const wantsToScrollConsoleToBottomRef = useRef(false);

    const showConsole = useCallback(() => {
      wantsToScrollConsoleToBottomRef.current = true;
      setActiveTab("console");
    }, []);

    useImperativeHandle(
      ref,
      () => {
        return { showConsole };
      },
      [showConsole]
    );

    const handleFrameError = useCallback(
      (e: Error) => {
        toast({
          title: "Unexpected error",
          description: "Please check the console for more information",
          variant: "destructive",
          action: (
            <ToastAction
              altText="Show console"
              onClick={() => {
                showConsole();
              }}
            >
              Show console
            </ToastAction>
          ),
        });
        console.error(e);
      },
      [toast, showConsole]
    );

    const isImageDebuggingAvailable =
      currentFrameStackItem &&
      "frameResult" in currentFrameStackItem &&
      !!currentFrameStackItem.frameResult.framesDebugInfo?.image;

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
              <FrameDebuggerRequestCardContent
                fetchFrame={frameState.fetchFrame}
                stack={frameState.framesStack}
              />
            </CardContent>
          </Card>
          {protocol.specification === "farcaster" &&
            mockHubContext &&
            setMockHubContext && (
              <MockHubConfig
                hubContext={mockHubContext}
                setHubContext={setMockHubContext}
              />
            )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Debug</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 w-full">
                  <span className="inline-flex items-center gap-2">
                    Image Layout{" "}
                    <WithTooltip
                      disabled={!isImageDebuggingAvailable}
                      tooltip={
                        <p>
                          Enables layout debugging on the image. In order to use
                          this functionality you must enable{" "}
                          <Link
                            className="underline font-semibold"
                            href="https://framesjs.org/reference/core/createFrames#debug"
                            target="_blank"
                          >
                            debug mode
                          </Link>{" "}
                          in your application.
                        </p>
                      }
                    >
                      <InfoIcon size={14} className="text-slate-500"></InfoIcon>
                    </WithTooltip>
                  </span>
                  <Switch
                    className="ml-auto"
                    disabled={!isImageDebuggingAvailable}
                    id="image-debug-mode"
                    checked={imageDebuggingEnabled}
                    onCheckedChange={setImageDebuggingEnabled}
                  ></Switch>
                </label>
              </div>
            </CardContent>
          </Card>
          <FrameDebuggerLinksSidebarSection hasExamples={hasExamples} />
        </div>
        <div className="flex flex-col gap-4 order-0 lg:order-1">
          <div className="w-full flex flex-col gap-1" id="frame-preview">
            <FrameUI
              frameState={frameState}
              allowPartialFrame={true}
              enableImageDebugging={imageDebuggingEnabled}
              onError={handleFrameError}
            />
            <div className="ml-auto text-sm text-slate-500">{url}</div>

            {!isLoading && (
              <>
                {currentFrameStackItem?.request.method === "GET" && (
                  <div className="my-5">
                    <h3 className="font-bold">Preview</h3>
                    <div className="border rounded mt-2">
                      <CollapsedFrameUI
                        frameState={frameState}
                        theme={{ bg: "white" }}
                        FrameImage={FrameImageNext}
                        allowPartialFrame
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {currentFrameStackItem?.status === "done" &&
                    (currentFrameStackItem.frameResult.specification ===
                      "farcaster" ||
                      currentFrameStackItem.frameResult.specification ===
                        "openframes") &&
                    currentFrameStackItem.frameResult.frame.buttons
                      ?.filter(
                        (button) =>
                          button.target?.startsWith(
                            "https://warpcast.com/~/add-cast-action"
                          ) ||
                          button.target?.startsWith(
                            "https://warpcast.com/~/composer-action"
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
                    <FrameDebuggerDiagnostics
                      stackItem={currentFrameStackItem}
                    />
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
                    />
                  </TabsContent>
                  <TabsContent className="overflow-y-auto" value="request">
                    <FrameDebuggerRequestDetails
                      frameStackItem={currentFrameStackItem}
                    />
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
                              currentFrameStackItem.frameResult
                                .specification === "farcaster_v2"
                                ? getFrameV2HtmlHead(
                                    currentFrameStackItem.frameResult.frame
                                  )
                                : getFrameHtmlHead(
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
                          {currentFrameStackItem.frameResult.specification ===
                          "farcaster_v2"
                            ? getFrameV2HtmlHead(
                                currentFrameStackItem.frameResult.frame
                              )
                            : getFrameHtmlHead(
                                "sourceFrame" in
                                  currentFrameStackItem.request &&
                                  currentFrameStackItem.request.sourceFrame
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
