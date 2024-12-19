import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Console } from "console-feed";
import { InboxIcon, Loader2Icon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Message } from "console-feed/lib/definitions/Component";
import { useQuery } from "@tanstack/react-query";
import { FrameAppNotificationsControlPanel } from "./frame-app-notifications-control-panel";
import { useFrameAppNotificationsManagerContext } from "../providers/FrameAppNotificationsManagerProvider";
import type { GETEventsResponseBody } from "../notifications/[namespaceId]/events/route";
import { Button } from "@/components/ui/button";
import { WithTooltip } from "./with-tooltip";
import type { UseFrameAppInIframeReturn } from "@frames.js/render/frame-app/iframe";

type FrameAppDebuggerNotificationsProps = {
  frameApp: Extract<UseFrameAppInIframeReturn, { status: "success" }>;
};

export function FrameAppDebuggerNotifications({
  frameApp,
}: FrameAppDebuggerNotificationsProps) {
  const frame = frameApp.frame;
  const frameAppNotificationManager = useFrameAppNotificationsManagerContext();
  const [events, setEvents] = useState<Message[]>([]);
  const notificationsQuery = useQuery({
    initialData: [],
    enabled: !!frameAppNotificationManager.state?.namespaceUrl,
    queryKey: [
      "frame-app-notifications-log",
      frameAppNotificationManager.state?.namespaceUrl,
    ],
    async queryFn() {
      if (!frameAppNotificationManager.state?.namespaceUrl) {
        return [] as Message[];
      }

      const response = await fetch(
        `${frameAppNotificationManager.state.namespaceUrl}/events`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        return [] as Message[];
      }

      const events = (await response.json()) as GETEventsResponseBody;

      return events.map((event): Message => {
        switch (event.type) {
          case "notification":
            return {
              method: "log",
              id: crypto.randomUUID(),
              data: ["🔔 Received notification", event.notification],
            };
          case "event":
            return {
              method: "info",
              id: crypto.randomUUID(),
              data: ["➡️ Send event", event],
            };
          case "event_failure": {
            return {
              method: "error",
              id: crypto.randomUUID(),
              data: ["❗ Received invalid response for event", event],
            };
          }
          case "event_success": {
            return {
              method: "log",
              id: crypto.randomUUID(),
              data: ["✅ Received successful response for event", event],
            };
          }
          default:
            event as never;
            return {
              method: "error",
              id: crypto.randomUUID(),
              data: ["Received unknown event", event],
            };
        }
      });
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (notificationsQuery.data) {
      setEvents((prev) => [...prev, ...notificationsQuery.data]);
    }
  }, [notificationsQuery.data]);

  if (frame.status !== "success") {
    return (
      <>
        <Alert variant="destructive">
          <AlertTitle>Invalid frame!</AlertTitle>
          <AlertDescription>
            Please check the diagnostics of initial frame
          </AlertDescription>
        </Alert>
      </>
    );
  }

  if (!frame.manifest) {
    return (
      <>
        <Alert variant="destructive">
          <AlertTitle>Missing manifest</AlertTitle>
          <AlertDescription>
            Please check the diagnostics of initial frame
          </AlertDescription>
        </Alert>
      </>
    );
  }

  if (frame.manifest.status === "failure") {
    return (
      <>
        <Alert variant="destructive">
          <AlertTitle>Invalid manifest!</AlertTitle>
          <AlertDescription>
            Please check the diagnostics of initial frame
          </AlertDescription>
        </Alert>
      </>
    );
  }

  if (!frame.manifest.manifest.frame?.webhookUrl) {
    return (
      <>
        <Alert variant="destructive">
          <AlertTitle>Missing webhookUrl</AlertTitle>
          <AlertDescription>
            Frame manifest must contain webhookUrl property in order to support
            notifications.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const notificationsEnabled =
    frameAppNotificationManager.state?.frame.status === "added" &&
    !!frameAppNotificationManager.state.frame.notificationDetails;

  return (
    <div className="flex flex-row flex-grow gap-4 w-full h-full">
      <div className="w-1/3">
        <FrameAppNotificationsControlPanel frameApp={frameApp} />
      </div>
      {events.length === 0 ? (
        <div className="flex flex-grow border rounded-lg p-2 items-center justify-center w-full">
          <div className="flex flex-col items-center max-w-[300px] text-center">
            <div className="w-[2em] h-[2em] relative">
              <InboxIcon className="text-gray-400 w-[2em] h-[2em]" />
              {!notificationsEnabled && (
                <Loader2Icon className="absolute -bottom-[7px] -right-[7px] h-[14px] w-[14px] animate-spin text-slate-800" />
              )}
            </div>
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              {!notificationsEnabled
                ? "Notifications are not enabled"
                : "No notifications"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {!notificationsEnabled
                ? "Notifications will appear here once they are enabled and the application sents any of them."
                : "No notifications received yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-2 flex flex-col gap-2 flex-grow w-full">
          <h3 className="font-semibold">
            Event log
            <WithTooltip tooltip="Clear log">
              <Button size="icon" variant="link" onClick={() => setEvents([])}>
                <TrashIcon className="h-[1em] w-[1em]" />
              </Button>
            </WithTooltip>
          </h3>
          <div className="w-full flex-grow overflow-y-auto">
            <Console logs={events} variant="light" />
          </div>
        </div>
      )}
    </div>
  );
}
