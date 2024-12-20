import { createContext, useContext, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FarcasterSignerInstance } from "@frames.js/render/identity/farcaster";
import type { FrameLaunchedInContext } from "../components/frame-debugger";
import type { NotificationSettings } from "../notifications/types";
import type {
  POSTNotificationsRequestBody,
  POSTNotificationsResponseBody,
} from "../notifications/route";
import type {
  GETNotificationsDetailResponseBody,
  POSTNotificationsDetailRequestBody,
  POSTNotificationsDetailResponseBody,
} from "../notifications/[namespaceId]/route";
import type { FrameNotificationDetails } from "@farcaster/frame-sdk";

export const notificationManagerQueryKeys = {
  settingsQuery: (fid: string, frameAppUrl: string): string[] => [
    "notification-settings",
    fid,
    frameAppUrl,
  ],
};

export type FrameAppNotificationsManager = {
  readonly state: GETNotificationsDetailResponseBody | undefined;
  addFrame(): Promise<
    Extract<NotificationSettings, { enabled: true }>["details"]
  >;
  removeFrame(): Promise<void>;
  enableNotifications(): Promise<FrameNotificationDetails>;
  disableNotifications(): Promise<void>;
  reload(): Promise<void>;
};

const FrameAppNotificationsManagerContext =
  createContext<FrameAppNotificationsManager>({
    state: undefined,
    async addFrame() {
      throw new Error("Not implemented");
    },
    async removeFrame() {},
    async enableNotifications() {
      throw new Error("Not implemented");
    },
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
  const namespaceSettingsRef = useRef<POSTNotificationsResponseBody | null>(
    null
  );
  const { signer } = farcasterSigner;
  const frameUrl = context.frame.button.action.url;
  const webhookUrl = context.parseResult.manifest?.manifest.frame?.webhookUrl;
  const queryClient = useQueryClient();

  const sendEvent = useMutation({
    async mutationFn(event: POSTNotificationsDetailRequestBody) {
      if (!namespaceSettingsRef.current) {
        throw new Error("Namespace settings not found");
      }

      const response = await fetch(namespaceSettingsRef.current.namespaceUrl, {
        method: "POST",
        body: JSON.stringify(event),
      });

      if (response.status !== 201 && response.status !== 200) {
        throw new Error("Failed to enable notifications");
      }

      return response.json() as Promise<POSTNotificationsDetailResponseBody>;
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
      if (signer?.status !== "approved" && signer?.status !== "impersonating") {
        throw new Error("Signer must be either approved or impersonating");
      }

      if (!webhookUrl) {
        throw new Error("Webhook URL not found");
      }

      let state: POSTNotificationsResponseBody;

      if (!namespaceSettingsRef.current) {
        const response = await fetch("/notifications", {
          method: "POST",
          body: JSON.stringify({
            fid: signer.fid,
            frameAppUrl: frameUrl,
            webhookUrl,
          } satisfies POSTNotificationsRequestBody),
        });

        if (response.status !== 201) {
          throw new Error("Failed to create notification settings");
        }

        state = (await response.json()) as POSTNotificationsResponseBody;

        namespaceSettingsRef.current = state;
      } else {
        const response = await fetch(
          namespaceSettingsRef.current.namespaceUrl,
          {
            method: "GET",
          }
        );

        if (!response.ok) {
          namespaceSettingsRef.current = null;

          throw new Error("Failed to fetch notification settings");
        }

        state = (await response.json()) as POSTNotificationsResponseBody;
      }

      return {
        manager: {
          state: state as GETNotificationsDetailResponseBody,
          async addFrame() {
            const result = await sendEvent.mutateAsync({
              action: "add_frame",
              privateKey: signer.privateKey,
            });

            if (result.type !== "frame_added") {
              throw new Error("Failed to add frame");
            }

            // refetch notification settings
            await queryClient.refetchQueries({
              queryKey,
            });

            return result.notificationDetails;
          },
          async removeFrame() {
            await sendEvent.mutateAsync({
              action: "remove_frame",
              privateKey: signer.privateKey,
            });

            // refetch notification settings
            await queryClient.refetchQueries({
              queryKey,
            });
          },
          async enableNotifications() {
            const result = await sendEvent.mutateAsync({
              action: "enable_notifications",
              privateKey: signer.privateKey,
            });

            // refetch notification settings
            await queryClient.refetchQueries({
              queryKey,
            });

            if (result.type === "notifications_enabled") {
              return result.notificationDetails;
            }

            throw new Error("Server returned incorrect response");
          },
          async disableNotifications() {
            await sendEvent.mutateAsync({
              action: "disable_notifications",
              privateKey: signer.privateKey,
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
