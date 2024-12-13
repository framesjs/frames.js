import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Console } from "console-feed";
import type { ParseFramesV2ResultWithFrameworkDetails } from "frames.js/frame-parsers";
import type { NotificationSettings } from "../notifications/route";
import { useCallback, useEffect, useState } from "react";
import { Message } from "console-feed/lib/definitions/Component";
import type { Notification } from "../notifications/[id]/route";

type FrameAppDebuggerNotificationsProps = {
  frame: ParseFramesV2ResultWithFrameworkDetails;
  notificationSettings: NotificationSettings["details"] | null | undefined;
};

export function FrameAppDebuggerNotifications({
  frame,
  notificationSettings,
}: FrameAppDebuggerNotificationsProps) {
  const [notifications, setNotifications] = useState<Message[]>([]);
  const loadNotifications = useCallback(async (url: string) => {
    try {
      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        return;
      }

      const notifications = (await response.json()) as Notification[];

      if (notifications.length === 0) {
        return;
      }

      setNotifications((prevNotifications) => {
        return [
          ...prevNotifications,
          ...notifications.map((notification): Message => {
            return {
              method: "log",
              id: notification.notificationId,
              data: ["Received notification", notification],
            };
          }),
        ];
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    // if url is set then start fetching notifications
    if (!notificationSettings?.url) {
      return;
    }

    // maybe use server sent events instead
    const interval = window.setInterval(
      () => loadNotifications(notificationSettings.url),
      5000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [loadNotifications, notificationSettings?.url]);

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

  // @todo we should show a way to enable notifications
  if (!notificationSettings) {
    return (
      <>
        <Alert>
          <AlertTitle>Notifications are not enabled</AlertTitle>
          <AlertDescription>
            In order debug the notifications you should allow the app to send
            notifications.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  // @todo add a way to send to webhook different events
  return (
    <div className="flex flex-grow">
      <Console logs={notifications} variant="light" />
    </div>
  );
}
