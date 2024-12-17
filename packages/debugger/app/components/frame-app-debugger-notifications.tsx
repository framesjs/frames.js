import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Console } from "console-feed";
import { InboxIcon, Loader2Icon } from "lucide-react";
import type { ParseFramesV2ResultWithFrameworkDetails } from "frames.js/frame-parsers";
import { useEffect, useState } from "react";
import { Message } from "console-feed/lib/definitions/Component";
import type { Notification } from "../notifications/[id]/route";
import { useQuery } from "@tanstack/react-query";
import { FrameAppNotificationsControlPanel } from "./frame-app-notifications-control-panel";
import { useFrameAppNotificationsManagerContext } from "../providers/FrameAppNotificationsManagerProvider";

type FrameAppDebuggerNotificationsProps = {
  frame: ParseFramesV2ResultWithFrameworkDetails;
};

export function FrameAppDebuggerNotifications({
  frame,
}: FrameAppDebuggerNotificationsProps) {
  const frameAppNotificationManager = useFrameAppNotificationsManagerContext();
  const [notifications, setNotifications] = useState<Message[]>([]);
  const notificationsQuery = useQuery({
    initialData: [],
    enabled: frameAppNotificationManager.state?.enabled ?? false,
    queryKey: [
      "frame-app-notifications-log",
      frameAppNotificationManager.state?.enabled
        ? frameAppNotificationManager.state.details.url
        : null,
    ],
    async queryFn() {
      if (!frameAppNotificationManager.state?.enabled) {
        return [] as Message[];
      }

      const response = await fetch(
        frameAppNotificationManager.state.details.url,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        return [] as Message[];
      }

      const data = (await response.json()) as Notification[];

      return data.map((notification): Message => {
        return {
          method: "log",
          id: notification.notificationId,
          data: ["Received notification", notification],
        };
      });
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (notificationsQuery.data) {
      setNotifications((prev) => [...prev, ...notificationsQuery.data]);
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

  if (!frame.manifest.manifest.frame.webhookUrl) {
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

  const notificationsNotEnabled = !frameAppNotificationManager.state?.enabled;

  // @todo on local dev we need to show an information that it won't be accessible to test notifications from non localhost frame apps
  // @todo on production we need to show an information that localhost frame apps notifications can't be tested
  // @todo show also events like frame add -> frame remove, notification enabled and disable in logs + response from frame app webhook so we can debug it
  return (
    <div className="flex flex-row flex-grow gap-4 w-full h-full">
      <div className="w-1/3">
        <FrameAppNotificationsControlPanel />
      </div>
      <div className="flex flex-grow border rounded-lg p-2 items-center justify-center">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center max-w-[300px] text-center">
            <div className="w-[2em] h-[2em] relative">
              <InboxIcon className="text-gray-400 w-[2em] h-[2em]" />
              {!notificationsNotEnabled && (
                <Loader2Icon className="absolute -bottom-[7px] -right-[7px] h-[14px] w-[14px] animate-spin text-slate-800" />
              )}
            </div>
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              {notificationsNotEnabled
                ? "Notifications are not enabled"
                : "No notifications"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {notificationsNotEnabled
                ? "Notifications will appear here once they are enabled and the application sents any of them."
                : "No notifications received yet."}
            </p>
          </div>
        ) : (
          <Console logs={notifications} variant="light" />
        )}
      </div>
    </div>
  );
}
