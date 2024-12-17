import type { SendNotificationRequest } from "@farcaster/frame-sdk";
import type { FrameClientConfig } from "@frames.js/render/use-frame-app";

export type Notification = Omit<SendNotificationRequest, "tokens">;

export type NotificationSettings =
  | {
      enabled: true;
      details: NonNullable<FrameClientConfig["notificationDetails"]>;
      webhookUrl: string;
    }
  | {
      enabled: false;
      webhookUrl: string;
    };

export interface NotificationsStorageInterface {
  addFrame(params: {
    fid: string;
    frameAppUrl: string;
    notificationsUrl: string;
    webhookUrl: string;
  }): Promise<Extract<NotificationSettings, { enabled: true }>>;
  removeFrame(params: { fid: string; frameAppUrl: string }): Promise<void>;
  disableNotifications(params: {
    fid: string;
    frameAppUrl: string;
  }): Promise<void>;
  recordNotification(
    notificationsUrl: string,
    notification: Notification
  ): Promise<void>;
  listNotifications(notificationsUrl: string): Promise<Notification[]>;
  getSettings(params: {
    fid: string;
    frameAppUrl: string;
  }): Promise<NotificationSettings | null>;
}
