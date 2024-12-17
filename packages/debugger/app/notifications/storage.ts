import type { FrameClientConfig } from "@frames.js/render/use-frame-app";
import type {
  Notification,
  NotificationSettings,
  NotificationsStorageInterface,
} from "./types";
import { Redis } from "@upstash/redis";
import crypto from "node:crypto";
import { NOTIFICATION_TTL_IN_SECONDS } from "../constants";

type NotificationsEndpointSettings = {
  token: string;
  fid: string;
  frameAppUrl: string;
};

export class RedisNotificationsStorage
  implements NotificationsStorageInterface
{
  private redis: Redis;

  constructor({ redis }: { redis: Redis }) {
    this.redis = redis;
  }

  async getSettings(params: {
    fid: string;
    frameAppUrl: string;
  }): Promise<NotificationSettings | null> {
    const settings = await this.redis.get<NotificationSettings>(
      createSettingsKey(params.fid, params.frameAppUrl)
    );

    if (!settings) {
      return null;
    }

    await this.redis.expire(
      createSettingsKey(params.fid, params.frameAppUrl),
      NOTIFICATION_TTL_IN_SECONDS
    );

    return settings;
  }

  async addFrame({
    fid,
    frameAppUrl,
    notificationsUrl,
    webhookUrl,
  }: {
    fid: string;
    frameAppUrl: string;
    webhookUrl: string;
    notificationsUrl: string;
  }) {
    const settings: Extract<NotificationSettings, { enabled: true }> = {
      enabled: true,
      details: {
        token: crypto.randomUUID(),
        url: notificationsUrl,
      },
      webhookUrl,
    };

    await this.redis
      .pipeline()
      .set<Extract<NotificationSettings, { enabled: true }>>(
        createSettingsKey(fid, frameAppUrl),
        settings
      )
      .set<NotificationsEndpointSettings>(
        createNotificationsEndpointSettingsKey(notificationsUrl),
        {
          fid,
          frameAppUrl,
          token: settings.details.token,
        },
        { ex: NOTIFICATION_TTL_IN_SECONDS }
      )
      .exec();

    return settings;
  }

  async removeFrame(params: {
    fid: string;
    frameAppUrl: string;
  }): Promise<void> {
    const result = await this.redis.del(
      createSettingsKey(params.fid, params.frameAppUrl)
    );

    if (!result) {
      throw new Error("Failed to remove notification settings");
    }
  }

  async disableNotifications({
    fid,
    frameAppUrl,
  }: {
    fid: string;
    frameAppUrl: string;
  }): Promise<void> {
    const settings = await this.redis.get<NotificationSettings>(
      createSettingsKey(fid, frameAppUrl)
    );

    if (!settings) {
      throw new Error("Notification settings not found");
    }

    if (!settings.enabled) {
      throw new Error("Notifications are already disabled");
    }

    const newSettings: NotificationSettings = {
      enabled: false,
      webhookUrl: settings.webhookUrl,
    };

    await this.redis
      .pipeline()
      .set<NotificationSettings>(
        createSettingsKey(fid, frameAppUrl),
        newSettings,
        { ex: NOTIFICATION_TTL_IN_SECONDS }
      )
      .del(createNotificationsEndpointSettingsKey(settings.details.url))
      .exec();
  }

  async recordNotification(
    notificationsUrl: string,
    notification: Notification
  ): Promise<void> {
    const notificationsEndpointSettings =
      await this.redis.get<NotificationsEndpointSettings>(
        createNotificationsEndpointSettingsKey(notificationsUrl)
      );

    if (!notificationsEndpointSettings) {
      throw new Error("Notifications endpoint settings not found");
    }

    const notificationSettings = await this.redis.get<NotificationSettings>(
      createSettingsKey(
        notificationsEndpointSettings.fid,
        notificationsEndpointSettings.frameAppUrl
      )
    );

    if (!notificationSettings) {
      throw new Error("Frame is not added");
    }

    if (!notificationSettings.enabled) {
      throw new Error("Notifications are disabled");
    }

    await this.redis
      .pipeline()
      .lpush(
        createNotificationsListStorageKey(notificationSettings.details.url),
        notification
      )
      .expire(
        createNotificationsListStorageKey(notificationSettings.details.url),
        NOTIFICATION_TTL_IN_SECONDS
      )
      .exec();

    return;
  }

  async listNotifications(notificationsUrl: string): Promise<Notification[]> {
    const notificationsEndpointSettings =
      await this.redis.get<NotificationsEndpointSettings>(
        createNotificationsEndpointSettingsKey(notificationsUrl)
      );

    if (!notificationsEndpointSettings) {
      throw new Error("Notifications endpoint settings not found");
    }

    const notificationSettings = await this.redis.get<NotificationSettings>(
      createSettingsKey(
        notificationsEndpointSettings.fid,
        notificationsEndpointSettings.frameAppUrl
      )
    );

    if (!notificationSettings || !notificationSettings.enabled) {
      return [];
    }

    const notifications = await this.redis.lpop<Notification[]>(
      createNotificationsListStorageKey(notificationSettings.details.url),
      100
    );

    await this.redis
      .pipeline()
      .expire(
        createNotificationsEndpointSettingsKey(notificationsUrl),
        NOTIFICATION_TTL_IN_SECONDS
      )
      .expire(
        createSettingsKey(
          notificationsEndpointSettings.fid,
          notificationsEndpointSettings.frameAppUrl
        ),
        NOTIFICATION_TTL_IN_SECONDS
      )
      .exec();

    return notifications || [];
  }
}

function createSettingsKey(fid: string, frameAppUrl: string) {
  return `notification-settings:${fid}:${frameAppUrl}`;
}

function createNotificationsEndpointSettingsKey(notificationsUrl: string) {
  return `notifications-endpoint-settings:${notificationsUrl}`;
}

function createNotificationsListStorageKey(notificationUrl: string) {
  return `notifications-list:${notificationUrl}`;
}
