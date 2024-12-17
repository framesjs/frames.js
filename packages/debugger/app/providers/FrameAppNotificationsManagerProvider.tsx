import { createContext, useContext } from "react";
import type { CreateNotificationSettings } from "../notifications/route";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FarcasterSignerInstance } from "@frames.js/render/identity/farcaster";
import { FrameLaunchedInContext } from "../components/frame-debugger";
import type { NotificationSettings } from "../notifications/types";

export const notificationManagerQueryKeys = {
  settingsQuery: (fid: string, frameAppUrl: string): string[] => [
    "notification-settings",
    fid,
    frameAppUrl,
  ],
};

export type FrameAppNotificationsManager = {
  readonly state: NotificationSettings | null | undefined;
  addFrame(): Promise<
    Extract<NotificationSettings, { enabled: true }>["details"]
  >;
  removeFrame(): Promise<void>;
  enableNotifications(): Promise<void>;
  disableNotifications(): Promise<void>;
  reload(): Promise<void>;
};

const FrameAppNotificationsManagerContext =
  createContext<FrameAppNotificationsManager>({
    state: null,
    async addFrame() {
      throw new Error("Not implemented");
    },
    async removeFrame() {},
    async enableNotifications() {},
    async disableNotifications() {},
    async reload() {},
  });

type FrameAppNotificationsManagerProviderProps = {
  children: React.ReactNode;
  manager: FrameAppNotificationsManager;
};

export function FrameAppNotificationsManagerProvider({
  children,
  manager,
}: FrameAppNotificationsManagerProviderProps) {
  return (
    <FrameAppNotificationsManagerContext.Provider value={manager}>
      {children}
    </FrameAppNotificationsManagerContext.Provider>
  );
}

type UseFrameAppNotificationsManagerOptions = {
  context: FrameLaunchedInContext;
  farcasterSigner: FarcasterSignerInstance;
};

type UseFrameAppNotificationsManagerResult = {
  manager: FrameAppNotificationsManager;
};

export function useFrameAppNotificationsManager({
  context,
  farcasterSigner,
}: UseFrameAppNotificationsManagerOptions) {
  const { signer } = farcasterSigner;
  const frameUrl = context.frame.button.action.url;

  const queryClient = useQueryClient();

  const addFrameMutation = useMutation({
    async mutationFn() {
      if (signer?.status !== "approved") {
        throw new Error("Signer not approved");
      }

      const webhookUrl =
        context.parseResult.manifest?.manifest.frame?.webhookUrl;

      if (!webhookUrl) {
        throw new Error("Webhook URL not found");
      }

      const response = await fetch("/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fid": signer.fid.toString(),
          "x-frame-url": frameUrl,
        },
        body: JSON.stringify({
          webhookUrl,
        }),
      });

      if (response.status !== 201) {
        throw new Error("Failed to add frame");
      }

      const data = (await response.json()) as CreateNotificationSettings;

      return data["details"];
    },
  });

  const removeFrameMutation = useMutation({
    async mutationFn() {
      if (signer?.status !== "approved") {
        throw new Error("Signer not approved");
      }

      const response = await fetch("/notifications", {
        method: "DELETE",
        headers: {
          "x-fid": signer.fid.toString(),
          "x-frame-url": frameUrl,
        },
      });

      if (response.status === 204) {
        return true;
      }

      throw new Error("Failed to remove frame");
    },
  });

  const enableNotificationsMutation = useMutation({
    async mutationFn() {
      if (signer?.status !== "approved") {
        throw new Error("Signer not approved");
      }

      const webhookUrl =
        context.parseResult.manifest?.manifest.frame?.webhookUrl;

      if (!webhookUrl) {
        throw new Error("Webhook URL not found");
      }

      const response = await fetch("/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fid": signer.fid.toString(),
          "x-frame-url": frameUrl,
        },
        body: JSON.stringify({
          webhookUrl,
        }),
      });

      if (response.status !== 201 && response.status !== 200) {
        throw new Error("Failed to enable notifications");
      }
    },
  });

  const disableNotificationsMutation = useMutation({
    async mutationFn({ notificationUrl }: { notificationUrl: string }) {
      if (signer?.status !== "approved") {
        throw new Error("Signer not approved");
      }

      const response = await fetch(notificationUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-fid": signer.fid.toString(),
          "x-frame-url": frameUrl,
        },
      });

      if (response.status === 204) {
        return;
      }

      throw new Error("Failed to disable notifications");
    },
  });

  return useQuery<UseFrameAppNotificationsManagerResult>({
    experimental_prefetchInRender: true,
    queryKey: [
      "frame-app-notifications-manager",
      signer?.status === "approved" ? signer.fid.toString() : null,
      context.frame.button.action.url,
    ],
    async queryFn({ queryKey }) {
      if (signer?.status !== "approved") {
        throw new Error("Signer not approved");
      }

      const response = await fetch("/notifications", {
        method: "GET",
        headers: {
          "x-fid": signer.fid.toString(),
          "x-frame-url": frameUrl,
        },
      });

      return {
        manager: {
          state: response.ok
            ? ((await response.json()) as NotificationSettings)
            : null,
          async addFrame() {
            const result = await addFrameMutation.mutateAsync();

            // refetch notification settings
            await queryClient.refetchQueries({
              queryKey,
            });

            return result;
          },
          async removeFrame() {
            if (!this.state) {
              throw new Error("Frame not added");
            }

            await removeFrameMutation.mutateAsync();

            // refetch notification settings
            await queryClient.refetchQueries({
              queryKey,
            });
          },
          async enableNotifications() {
            if (!this.state) {
              throw new Error("Frame not added");
            }

            if (this.state.enabled === true) {
              throw new Error("Notifications already enabled");
            }

            await enableNotificationsMutation.mutateAsync();

            // refetch notification settings
            await queryClient.refetchQueries({
              queryKey,
            });
          },
          async disableNotifications() {
            if (!this.state) {
              throw new Error("Frame not added");
            }

            if (this.state.enabled === false) {
              throw new Error("Notifications already disabled");
            }

            await disableNotificationsMutation.mutateAsync({
              notificationUrl: this.state.details.url,
            });

            // refetch notification settings
            await queryClient.refetchQueries({
              queryKey,
            });
          },
          reload() {
            return queryClient.refetchQueries({
              queryKey,
            });
          },
        },
      };
    },
  });
}

export function useFrameAppNotificationsManagerContext() {
  return useContext(FrameAppNotificationsManagerContext);
}
