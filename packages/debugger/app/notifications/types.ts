import type {
  FrameNotificationDetails,
  SendNotificationRequest,
} from "@farcaster/frame-sdk";
import type { FrameServerEvent } from "frames.js/farcaster-v2/events";

export type Notification = SendNotificationRequest;

export type RecordedEvent =
  | {
      type: "notification";
      notification: Notification;
      id: string;
    }
  | {
      type: "event";
      event: FrameServerEvent;
      id: string;
    }
  | {
      type: "event_success";
      event: FrameServerEvent;
      id: string;
      eventId: string;
    }
  | {
      type: "event_failure";
      event: FrameServerEvent;
      id: string;
      eventId: string;
      message: string;
      response?: {
        status: number;
        headers: Record<string, string | string[]>;
        body: string;
      };
    };

export type NotificationSettings =
  | {
      enabled: true;
      details: FrameNotificationDetails;
      webhookUrl: string;
      signerPrivateKey: string;
    }
  | {
      enabled: false;
      webhookUrl: string;
      signerPrivateKey: string;
    };

export type NotificationsNamespace = {
  id: string;
  fid: number;
  frameAppUrl: string;
  namespaceUrl: string;
  webhookUrl: string;
  frame:
    | {
        status: "added";
        notificationDetails: null | FrameNotificationDetails;
      }
    | {
        status: "removed";
      };
};

export interface StorageInterface {
  registerNamespace(
    id: string,
    params: {
      fid: number;
      frameAppUrl: string;
      webhookUrl: string;
    }
  ): Promise<NotificationsNamespace>;

  getNamespace(id: string): Promise<NotificationsNamespace | null>;

  addFrame(
    namespace: NotificationsNamespace
  ): Promise<FrameNotificationDetails>;

  removeFrame(namespace: NotificationsNamespace): Promise<void>;

  enableNotifications(
    namespace: NotificationsNamespace
  ): Promise<FrameNotificationDetails>;

  disableNotifications(namespace: NotificationsNamespace): Promise<void>;

  recordEvent(namespaceId: string, event: RecordedEvent): Promise<void>;

  listEvents(namespaceId: string): Promise<RecordedEvent[]>;
}
