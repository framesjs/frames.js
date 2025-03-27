import "@farcaster/auth-kit/styles.css";
import { Button } from "@/components/ui/button";
import type { FrameLaunchedInContext } from "./frame-debugger";
import { WithTooltip } from "./with-tooltip";
import { RefreshCwIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { type UseFrameAppInIframeReturn } from "@frames.js/render/frame-app/iframe";
import { useReducer, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DebuggerConsole } from "./debugger-console";
import type { FarcasterSignerInstance } from "@frames.js/render/identity/farcaster";
import { FrameAppDebuggerNotifications } from "./frame-app-debugger-notifications";
import {
  FrameAppNotificationsManagerProvider,
  useFrameAppNotificationsManager,
} from "../providers/FrameAppNotificationsManagerProvider";
import { FrameAppDebuggerViewProfileDialog } from "./frame-app-debugger-view-profile-dialog";
import { FrameApp } from "./frame-app";

const devicePresets = [
  { name: "iPhone 4", width: 320, height: 480 },
  { name: "iPhone 5/SE", width: 320, height: 568 },
  { name: "iPhone 6/7/8", width: 375, height: 667 },
  { name: "iPhone XR", width: 414, height: 896 },
  { name: "iPhone 12 Pro", width: 390, height: 844 },
  { name: "iPhone 14 Pro Max", width: 430, height: 932 },
  { name: "Pixel 7", width: 412, height: 915 },
];

type TabValues = "events" | "console" | "notifications";

type FrameAppDebuggerProps = {
  context: FrameLaunchedInContext;
  farcasterSigner: FarcasterSignerInstance;
  onClose: () => void;
};

export function FrameAppDebugger({
  context,
  farcasterSigner,
  onClose,
}: FrameAppDebuggerProps) {
  const [appIdCounter, reloadApp] = useReducer((state) => state + 1, 0);
  const [frameApp, setFrameApp] = useState<UseFrameAppInIframeReturn | null>(
    null
  );
  const farcasterSignerRef = useRef(farcasterSigner);
  farcasterSignerRef.current = farcasterSigner;

  const userContext = useRef<{ fid: number }>({ fid: -1 });

  if (
    (farcasterSigner.signer?.status === "approved" ||
      farcasterSigner.signer?.status === "impersonating") &&
    userContext.current.fid !== farcasterSigner.signer.fid
  ) {
    userContext.current = {
      fid: farcasterSigner.signer.fid,
    };
  }

  const frameAppNotificationManager = useFrameAppNotificationsManager({
    farcasterSigner,
    context,
  });
  const debuggerConsoleTabRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabValues>("notifications");
  const [viewFidProfile, setViewFidProfile] = useState<number | null>(null);

  const [frameWidth, setFrameWidth] = useState<number>(0);
  const [frameHeight, setFrameHeight] = useState<number>(0);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[300px_500px_1fr] p-4 gap-4 bg-slate-50 max-w-full w-full">
        <div className="flex flex-col gap-4 order-1 lg:order-0">
          <div className="flex flex-row gap-2">
            <WithTooltip tooltip={<p>Reload frame app</p>}>
              <Button
                className="flex flex-row gap-3 items-center shadow-sm border"
                variant={"outline"}
                onClick={() => {
                  reloadApp();
                }}
              >
                <RefreshCwIcon size={20} />
              </Button>
            </WithTooltip>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center gap-2">
              <div className="flex flex-col">
                <label
                  htmlFor="frameWidth"
                  className="text-xs text-gray-500 mb-1"
                >
                  Width (px)
                </label>
                <input
                  id="frameWidth"
                  type="number"
                  className="w-24 h-9 px-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="500"
                  min="100"
                  value={frameWidth || ""}
                  onChange={(e) => {
                    setFrameWidth(Number(e.target.value));
                  }}
                />
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="frameHeight"
                  className="text-xs text-gray-500 mb-1"
                >
                  Height (px)
                </label>
                <input
                  id="frameHeight"
                  type="number"
                  className="w-24 h-9 px-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="600"
                  min="100"
                  value={frameHeight || ""}
                  onChange={(e) => {
                    setFrameHeight(Number(e.target.value));
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500 mb-1">
                Device Presets
              </label>
              <div className="flex flex-col gap-2 w-48">
                {devicePresets.map((preset) => (
                  <Button
                    key={preset.name}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFrameWidth(preset.width);
                      setFrameHeight(preset.height);
                    }}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 order-0 lg:order-1">
          <FrameApp
            key={appIdCounter}
            frameAppNotificationManager={frameAppNotificationManager}
            userContext={userContext.current}
            onClose={onClose}
            onViewProfile={async (params) => setViewFidProfile(params.fid)}
            onFrameAppUpdate={setFrameApp}
            context={context}
            width={frameWidth}
            height={frameHeight}
          />
        </div>
        <div className="flex flex-row gap-4 order-2 md:col-span-2 lg:col-span-1 lg:order-2">
          {frameAppNotificationManager.status === "success" ? (
            <FrameAppNotificationsManagerProvider
              manager={frameAppNotificationManager.data.manager}
            >
              <Card className="w-full max-h-[600px]">
                <CardContent className="p-5 h-full">
                  <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as TabValues)}
                    className="grid grid-rows-[auto_1fr] w-full h-full"
                  >
                    <TabsList className={cn("grid w-full grid-cols-2")}>
                      <TabsTrigger value="notifications">
                        Notifications
                      </TabsTrigger>
                      <TabsTrigger value="console">Console</TabsTrigger>
                    </TabsList>
                    <TabsContent
                      className="overflow-hidden"
                      value="notifications"
                    >
                      <FrameAppDebuggerNotifications
                        frameApp={frameApp}
                        farcasterSigner={farcasterSigner.signer}
                      />
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
                  </Tabs>
                </CardContent>
              </Card>
            </FrameAppNotificationsManagerProvider>
          ) : null}
        </div>
      </div>
      {viewFidProfile !== null && (
        <FrameAppDebuggerViewProfileDialog
          fid={viewFidProfile}
          onDismiss={() => {
            setViewFidProfile(null);
          }}
        />
      )}
    </>
  );
}
