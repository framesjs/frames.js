import type { RecordedEvent } from "./types";
import { Redis } from "@upstash/redis";
import crypto from "node:crypto";
import { NOTIFICATION_TTL_IN_SECONDS } from "../constants";
import type { FrameNotificationDetails } from "@farcaster/frame-sdk";

type NotificationsNamespace = {
  id: string;
  fid: number;
  frameAppUrl: string;
  signerPrivateKey: string;
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

export class RedisNotificationsStorage {
  constructor(
    private redis: Redis,
    private serverUrl: string
  ) {}

  async registerNamespace(
    id: string,
    params: {
      fid: number;
      frameAppUrl: string;
      signerPrivateKey: string;
      webhookUrl: string;
    }
  ) {
    const namespace: NotificationsNamespace = {
      id,
      fid: params.fid,
      frameAppUrl: params.frameAppUrl,
      signerPrivateKey: params.signerPrivateKey,
      namespaceUrl: new URL(`/notifications/${id}`, this.serverUrl).toString(),
      webhookUrl: params.webhookUrl,
      frame: {
        status: "removed",
      },
    };

    await this.redis.set<NotificationsNamespace>(
      createNamespaceKey(id),
      namespace,
      {
        ex: NOTIFICATION_TTL_IN_SECONDS,
      }
    );

    return namespace;
  }

  async getNamespace(id: string): Promise<NotificationsNamespace | null> {
    const namespace = await this.redis.get<NotificationsNamespace>(
      createNamespaceKey(id)
    );

    if (!namespace) {
      return null;
    }

    await this.redis.expire(
      createNamespaceKey(id),
      NOTIFICATION_TTL_IN_SECONDS
    );

    return namespace;
  }

  async addFrame(namespace: NotificationsNamespace) {
    if (namespace.frame.status === "added") {
      throw new Error("Frame is already added");
    }

    const token = crypto.randomUUID();
    const url = new URL(
      `/notifications/${namespace.id}/send`,
      this.serverUrl
    ).toString();
    const notificationDetails: FrameNotificationDetails = {
      url,
      token,
    };

    await this.redis.set<NotificationsNamespace>(
      createNamespaceKey(namespace.id),
      {
        ...namespace,
        frame: {
          status: "added",
          notificationDetails,
        },
      },
      {
        ex: NOTIFICATION_TTL_IN_SECONDS,
      }
    );

    return notificationDetails;
  }

  async removeFrame(namespace: NotificationsNamespace) {
    if (namespace.frame.status === "removed") {
      throw new Error("Frame is already removed");
    }

    await this.redis.set<NotificationsNamespace>(
      createNamespaceKey(namespace.id),
      {
        ...namespace,
        frame: {
          status: "removed",
        },
      },
      {
        ex: NOTIFICATION_TTL_IN_SECONDS,
      }
    );
  }

  async enableNotifications(namespace: NotificationsNamespace) {
    if (namespace.frame.status === "removed") {
      throw new Error("Frame is not added");
    }

    const token = crypto.randomUUID();
    const url = new URL(
      `/notifications/${namespace.id}/send`,
      this.serverUrl
    ).toString();
    const notificationDetails: FrameNotificationDetails = {
      token,
      url,
    };

    await this.redis.set<NotificationsNamespace>(
      createNamespaceKey(namespace.id),
      {
        ...namespace,
        frame: {
          status: "added",
          notificationDetails,
        },
      },
      {
        ex: NOTIFICATION_TTL_IN_SECONDS,
      }
    );

    return notificationDetails;
  }

  async disableNotifications(namespace: NotificationsNamespace) {
    if (namespace.frame.status === "removed") {
      throw new Error("Frame is not added");
    }

    await this.redis.set<NotificationsNamespace>(
      createNamespaceKey(namespace.id),
      {
        ...namespace,
        frame: {
          status: "added",
          notificationDetails: null,
        },
      },
      {
        ex: NOTIFICATION_TTL_IN_SECONDS,
      }
    );
  }

  async recordEvent(namespaceId: string, event: RecordedEvent): Promise<void> {
    const eventListStorageKey = createEventListStorageKey(namespaceId);

    await this.redis
      .pipeline()
      .rpush<RecordedEvent>(eventListStorageKey, event)
      .expire(eventListStorageKey, NOTIFICATION_TTL_IN_SECONDS)
      .exec();

    return;
  }

  async listEvents(namespaceId: string): Promise<RecordedEvent[]> {
    const namespace = await this.getNamespace(namespaceId);

    if (!namespace || namespace.frame.status === "removed") {
      return [];
    }

    const eventListStorageKey = createEventListStorageKey(namespaceId);

    const notifications = await this.redis.lpop<RecordedEvent[]>(
      eventListStorageKey,
      100
    );

    return notifications || [];
  }
}

function createEventListStorageKey(namespaceId: string) {
  return `notifications-namespace:${namespaceId}:events`;
}

function createNamespaceKey(namespaceId: string) {
  return `notifications-namespace:${namespaceId}`;
}
