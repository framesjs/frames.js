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
