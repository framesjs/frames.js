import type { SendNotificationRequest } from "@farcaster/frame-sdk";
import type { FrameClientConfig } from "@frames.js/render/use-frame-app";
import type { FrameEvent } from "frames.js/farcaster-v2/events";

export type Notification = SendNotificationRequest;

export type RecordedEvent =
  | {
      type: "notification";
      notification: Notification;
      id: string;
    }
  | {
      type: "event";
      event: FrameEvent;
      id: string;
    }
  | {
      type: "event_success";
      event: FrameEvent;
      id: string;
      eventId: string;
    }
  | {
      type: "event_failure";
      event: FrameEvent;
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
      details: NonNullable<FrameClientConfig["notificationDetails"]>;
      webhookUrl: string;
      signerPrivateKey: string;
    }
  | {
      enabled: false;
      webhookUrl: string;
      signerPrivateKey: string;
    };
