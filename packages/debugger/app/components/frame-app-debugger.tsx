import { Button } from "@/components/ui/button";
import type { FrameLaunchedInContext } from "./frame-debugger";
import { WithTooltip } from "./with-tooltip";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  type FramePrimaryButton,
  type ResolveClientFunction,
  type FrameClientConfig,
  useFrameAppInIframe,
} from "@frames.js/render/use-frame-app";
import { useCallback, useRef, useState } from "react";
import { useWagmiProvider } from "@frames.js/render/frame-app/provider/wagmi";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DebuggerConsole } from "./debugger-console";
import Image from "next/image";
import { fallbackFrameContext } from "@frames.js/render";
import { Console } from "console-feed";
import type { Message } from "console-feed/lib/definitions/Component";
import type { FarcasterSignerInstance } from "@frames.js/render/identity/farcaster";
import type { NotificationSettings } from "../notifications/route";
import { FrameAppDebuggerNotifications } from "./frame-app-debugger-notifications";

type TabValues = "events" | "console" | "notifications";

type FrameAppDebuggerProps = {
  context: FrameLaunchedInContext;
  farcasterSigner: FarcasterSignerInstance;
};

const addFrameRequestsCache = new Set<string>();

export function FrameAppDebugger({
  context,
  farcasterSigner,
}: FrameAppDebuggerProps) {
  const farcasterSignerRef = useRef(farcasterSigner);
  farcasterSignerRef.current = farcasterSigner;
  const { toast } = useToast();
  const debuggerConsoleTabRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeTab, setActiveTab] = useState<TabValues>("events");
  const [isAppReady, setIsAppReady] = useState(false);
  const [events, setEvents] = useState<Message[]>([]);
  const [primaryButton, setPrimaryButton] = useState<{
    button: FramePrimaryButton;
    callback: () => void;
  } | null>(null);
  const provider = useWagmiProvider();
  const logEvent = useCallback((method: Message["method"], ...args: any[]) => {
    setEvents((prev) => [
      ...prev,
      {
        id: prev.length.toString(),
        method,
        data: args,
      },
    ]);
  }, []);
  const resolveClient: ResolveClientFunction = useCallback(async () => {
    const signer = farcasterSignerRef.current.signer;
    let notificationDetails: FrameClientConfig["notificationDetails"];

    if (signer?.status !== "approved") {
      console.debug(
        "Signer not approved, cannot resolve notification settings"
      );
    } else {
      const response = await fetch("/notifications", {
        headers: {
          "x-fid": signer.fid.toString(),
          "x-frame-app-url": context.frame.button.action.url,
        },
      });

      if (response.status === 200) {
        const data = await response.json();

        notificationDetails = data;
      } else if (response.status === 403) {
        toast({
          title: "Access Forbidden",
          description: "Debugger is probably misconfigured.",
          variant: "destructive",
        });
      } else if (response.status === 401) {
        toast({
          title: "Not Authenticated",
          description: "Check that you have approved farcaster signer.",
          variant: "destructive",
        });
      }
    }

    return {
      clientFid: parseInt(process.env.FARCASTER_DEVELOPER_FID ?? "-1"),
      added: !!notificationDetails,
      notificationDetails,
    };
  }, [context.frame.button.action.url, toast]);
  /**
   * Undefined means that it was never changed, so we should use the value from client
   */
  const [notificationSettings, setNotificationSettings] = useState<
    NotificationSettings["details"] | null | undefined
  >(undefined);
  const frameApp = useFrameAppInIframe({
    debug: true,
    source: context.parseResult,
    client: resolveClient,
    location:
      context.context === "button_press"
        ? {
            type: "launcher",
          }
        : {
            type: "cast_embed",
            cast: fallbackFrameContext.castId,
          },
    farcasterSigner,
    provider,
    proxyUrl: "/frames",
    addFrameRequestsCache,
    onReady(options) {
      logEvent("info", "sdk.actions.ready() called", { options });
      setIsAppReady(true);
    },
    onClose() {
      logEvent("info", "sdk.actions.close() called");
      toast({
        title: "Frame app closed",
        description: "The frame app called close() action.",
      });
    },
    onOpenUrl(url) {
      logEvent("info", "sdk.actions.openUrl() called", { url });
      window.open(url, "_blank");
    },
    onPrimaryButtonSet(button, buttonCallback) {
      logEvent("info", "sdk.actions.setPrimaryButton() called", { button });
      setPrimaryButton({
        button,
        callback: () => {
          buttonCallback();
        },
      });
    },
    async onAddFrameRequested(parseResult) {
      // this is not compliant with how it should work in production
      // but this is debugger, what if you want to test your function repeately
      addFrameRequestsCache.clear();

      logEvent("info", "sdk.actions.addFrame() called");

      if (farcasterSigner.signer?.status !== "approved") {
        toast({
          title: "Signer not approved",
          description:
            "Signer is not approved. Approved farcaster signer is necessary.",
          variant: "destructive",
        });

        return false;
      }

      const webhookUrl = parseResult.manifest?.manifest.frame?.webhookUrl;

      if (!webhookUrl) {
        toast({
          title: "Webhook URL not found",
          description:
            "Webhook URL is not found in the manifest. It is required in order to enable notifications.",
          variant: "destructive",
        });

        return false;
      }

      // check what is the status of notifications for this app and signer
      // if there are no settings ask for user's consent and store the result
      const consent = window.confirm(
        "Do you want to add the frame to the app?"
      );

      if (!consent) {
        return false;
      }

      // register the settings
      const response = await fetch("/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid: farcasterSigner.signer.fid,
          frameUrl: context.frame.button.action.url,
          webhookUrl,
        }),
      });

      if (response.status !== 201) {
        toast({
          title: "Failed to register notifications",
          description: "Failed to register notifications for this app.",
          variant: "destructive",
        });

        return false;
      }

      const settings = (await response.json()) as NotificationSettings;

      setNotificationSettings(settings.details);

      return {
        added: true,
        notificationDetails: settings.details,
      };
    },
    onDebugEthProviderRequest(parameters) {
      logEvent("info", "sdk.wallet.ethProvider.request() called", {
        parameters,
      });
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[300px_500px_1fr] p-4 gap-4 bg-slate-50 max-w-full w-full">
      <div className="flex flex-col gap-4 order-1 lg:order-0">
        <div className="flex flex-row gap-2">
          <WithTooltip tooltip={<p>Reload frame app</p>}>
            <Button
              className="flex flex-row gap-3 items-center shadow-sm border"
              variant={"outline"}
              onClick={() => {
                // reload iframe
                if (iframeRef.current) {
                  iframeRef.current.src = "";
                  iframeRef.current.src = context.frame.button.action.url;
                  setIsAppReady(false);
                }
              }}
            >
              <RefreshCwIcon size={20} />
            </Button>
          </WithTooltip>
        </div>
      </div>
      <div className="flex flex-col gap-4 order-0 lg:order-1">
        <div
          className="flex flex-col gap-1 w-[424px] h-[695px] relative"
          id="frame-app-preview"
        >
          {frameApp.status === "pending" ||
            (!isAppReady && (
              <div
                className={cn(
                  "bg-white flex items-center justify-center absolute top-0 bottom-0 left-0 right-0"
                )}
                style={{
                  backgroundColor:
                    context.frame.button.action.splashBackgroundColor,
                }}
              >
                <div className="w-[200px] h-[200px] relative">
                  <Image
                    alt={`${name} splash image`}
                    src={context.frame.button.action.splashImageUrl}
                    width={200}
                    height={200}
                  />
                  <div className="absolute bottom-0 right-0">
                    <Loader2Icon
                      className="animate-spin text-primary"
                      size={40}
                    />
                  </div>
                </div>
              </div>
            ))}
          {frameApp.status === "success" && (
            <>
              <iframe
                className="flex h-full w-full border rounded-lg"
                sandbox="allow-forms allow-scripts allow-same-origin"
                ref={iframeRef}
                {...frameApp.iframeProps}
              />
              {!!primaryButton && !primaryButton.button.hidden && (
                <div className="w-full py-1">
                  <Button
                    className="w-full gap-2"
                    disabled={
                      primaryButton.button.disabled ||
                      primaryButton.button.loading
                    }
                    onClick={() => {
                      primaryButton.callback();
                    }}
                    size="lg"
                    type="button"
                  >
                    {primaryButton.button.loading && (
                      <Loader2Icon className="animate-spin" />
                    )}
                    {primaryButton.button.text}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex flex-row gap-4 order-2 md:col-span-2 lg:col-span-1 lg:order-2">
        {frameApp.status === "success" ? (
          <Card className="w-full max-h-[600px]">
            <CardContent className="p-5 h-full">
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as TabValues)}
                className="grid grid-rows-[auto_1fr] w-full h-full"
              >
                <TabsList className={cn("grid w-full grid-cols-3")}>
                  <TabsTrigger value="events">Events</TabsTrigger>
                  <TabsTrigger value="console">Console</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>
                <TabsContent className="overflow-y-auto" value="events">
                  <Console logs={events} variant="light" />
                </TabsContent>
                <TabsContent
                  className="overflow-y-auto"
                  ref={debuggerConsoleTabRef}
                  value="console"
                >
                  <DebuggerConsole
                    onMount={(element) => {
                      if (debuggerConsoleTabRef.current) {
                        debuggerConsoleTabRef.current.scrollTo(
                          0,
                          element.scrollHeight
                        );
                      }
                    }}
                  />
                </TabsContent>
                <TabsContent value="notifications">
                  <FrameAppDebuggerNotifications
                    frame={frameApp.frame}
                    notificationSettings={
                      notificationSettings === undefined
                        ? frameApp.client.notificationDetails
                        : notificationSettings
                    }
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
