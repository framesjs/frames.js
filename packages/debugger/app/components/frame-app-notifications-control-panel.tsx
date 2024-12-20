import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import {
  ExternalLinkIcon,
  InfoIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { useFrameAppNotificationsManagerContext } from "../providers/FrameAppNotificationsManagerProvider";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { WithTooltip } from "./with-tooltip";
import { UseFrameAppInIframeReturn } from "@frames.js/render/frame-app/iframe";

type FrameAppNotificationsControlPanelProps = {
  frameApp: Extract<UseFrameAppInIframeReturn, { status: "success" }>;
};

export function FrameAppNotificationsControlPanel({
  frameApp,
}: FrameAppNotificationsControlPanelProps) {
  const [state, setState] = useState<
    | "idle"
    | "adding-frame"
    | "removing-frame"
    | "enabling-notifications"
    | "disabling-notifications"
    | "reloading-settings"
  >("idle");
  const frameAppNotificationManager = useFrameAppNotificationsManagerContext();
  const isAddedToClient =
    frameAppNotificationManager.state?.frame.status === "added";
  const hasNotificationsEnabled =
    frameAppNotificationManager.state?.frame.status === "added" &&
    !!frameAppNotificationManager.state.frame.notificationDetails;

  const addFrame = useCallback(async () => {
    try {
      setState("adding-frame");
      await frameAppNotificationManager.addFrame();
    } finally {
      setState("idle");
    }
  }, [frameAppNotificationManager]);

  const removeFrame = useCallback(async () => {
    try {
      setState("removing-frame");
      await frameAppNotificationManager.removeFrame();
      frameApp.emitter.emit({
        event: "frame_removed",
      });
    } finally {
      setState("idle");
    }
  }, [frameAppNotificationManager, frameApp.emitter]);

  const reloadSettings = useCallback(async () => {
    try {
      setState("reloading-settings");

      await frameAppNotificationManager.reload();
    } finally {
      setState("idle");
    }
  }, [frameAppNotificationManager]);

  const toggleNotifications = useCallback(
    async (newValue: boolean) => {
      try {
        if (newValue) {
          setState("enabling-notifications");
          const notificationDetails =
            await frameAppNotificationManager.enableNotifications();
          frameApp.emitter.emit({
            event: "notifications_enabled",
            notificationDetails,
          });
        } else {
          setState("disabling-notifications");
          await frameAppNotificationManager.disableNotifications();
          frameApp.emitter.emit({
            event: "notifications_disabled",
          });
        }
      } finally {
        setState("idle");
      }
    },
    [frameApp.emitter, frameAppNotificationManager]
  );

  return (
    <div className="flex flex-col gap-4 w-full border rounded-lg p-2">
      <h3 className="font-semibold">
        Client settings
        <WithTooltip tooltip="Reload settings">
          <Button
            disabled={state !== "idle"}
            onClick={reloadSettings}
            size="icon"
            type="button"
            variant="link"
          >
            <RefreshCwIcon
              className={cn(
                "h-[1em] w-[1em]",
                state === "reloading-settings" && "animate-spin"
              )}
            />
          </Button>
        </WithTooltip>
      </h3>
      {!window.location.origin.match(/^https?:\/\/(localhost|127.0.0.1)/) && (
        <Alert variant="destructive">
          <ShieldAlertIcon className="h-[1em] w-[1em]"></ShieldAlertIcon>
          <AlertTitle>Be careful!</AlertTitle>
          <AlertDescription>
            At the moment we&apos;re sending your signer private key to the
            backend to sign event payload sent to webhook. We aren&apos;t
            storing your private key.
          </AlertDescription>
        </Alert>
      )}
      {isAddedToClient ? (
        <>
          <div className="flex gap-2 items-center">
            <Switch
              disabled={state !== "idle"}
              id="notifications-enabled"
              checked={hasNotificationsEnabled}
              onCheckedChange={toggleNotifications}
            />
            <Label
              htmlFor="notifications-enabled"
              className="inline-flex gap-2 items-center"
            >
              Notifications{" "}
              {state === "disabling-notifications" ||
              state === "enabling-notifications" ? (
                <Loader2Icon className="animate-spin h-[1em] w-[1em]" />
              ) : null}
            </Label>
          </div>
          <div>
            <Button
              className="gap-2"
              disabled={state !== "idle"}
              onClick={removeFrame}
              variant="secondary"
              type="button"
            >
              {state === "removing-frame" ? (
                <>
                  <Loader2Icon className="animate-spin h-[1em] w-[1em]" />{" "}
                  Removing...
                </>
              ) : (
                "Remove from client"
              )}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Frame not added to client</AlertTitle>
            <AlertDescription>
              You need to add the frame to a client to be able to receive
              notifications.{" "}
              <Link
                className="underline inline-flex gap-2 items-center"
                href="https://docs.farcaster.xyz/developers/frames/v2/notifications_webhooks#have-users-add-your-frame-to-their-farcaster-client"
                target="_blank"
                rel="noopener noreferrer"
              >
                See specification{" "}
                <ExternalLinkIcon className="h-[1em] w-[1em]" />
              </Link>
              .
            </AlertDescription>
          </Alert>
          <div>
            <Button
              className="gap-2"
              disabled={state !== "idle"}
              onClick={addFrame}
              type="button"
            >
              {state === "adding-frame" ? (
                <>
                  <Loader2Icon className="animate-spin h-[1em] w-[1em]" />{" "}
                  Adding...
                </>
              ) : (
                "Add to client"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
