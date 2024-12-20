import Database from "better-sqlite3";
import type {
  NotificationsNamespace,
  RecordedEvent,
  StorageInterface,
} from "../types";
import { serverEventSchema } from "@farcaster/frame-sdk";
import type { FrameNotificationDetails } from "@farcaster/frame-sdk";
import crypto from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { sendNotificationRequestSchema } from "../parsers";

const NotificationsNamespaceSchema = z.object({
  id: z.string(),
  fid: z.number(),
  frameAppUrl: z.string(),
  namespaceUrl: z.string(),
  webhookUrl: z.string(),
  frame: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        return JSON.parse(val);
      }

      return val;
    },
    z.discriminatedUnion("status", [
      z.object({
        status: z.literal("added"),
        notificationDetails: z.nullable(
          z.object({
            url: z.string(),
            token: z.string(),
          })
        ),
      }),
      z.object({
        status: z.literal("removed"),
      }),
    ])
  ),
});

const RecordedEventSchema = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      return JSON.parse(val);
    }

    return val;
  },
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("notification"),
      notification: sendNotificationRequestSchema,
      id: z.string(),
    }),
    z.object({
      type: z.literal("event"),
      event: serverEventSchema,
      id: z.string(),
    }),
    z.object({
      type: z.literal("event_success"),
      event: serverEventSchema,
      id: z.string(),
      eventId: z.string(),
    }),
    z.object({
      type: z.literal("event_failure"),
      event: serverEventSchema,
      id: z.string(),
      eventId: z.string(),
      message: z.string(),
      response: z.optional(
        z.object({
          status: z.number(),
          headers: z.record(z.union([z.string(), z.array(z.string())])),
          body: z.string(),
        })
      ),
    }),
  ])
);

const EventLogRowSchema = z.object({
  id: z.string(),
  namespaceId: z.string(),
  event: RecordedEventSchema,
});

let storage: SQLiteStorage | null = null;

export async function getStorage(serverUrl: string): Promise<StorageInterface> {
  if (!storage) {
    const dbPath = path.resolve(process.cwd(), "./notifications.db");

    const db = new Database(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id TEXT PRIMARY KEY,
        fid INTEGER,
        frameAppUrl TEXT,
        namespaceUrl TEXT,
        webhookUrl TEXT,
        frame TEXT
      );

      CREATE TABLE IF NOT EXISTS event_log (
        id TEXT PRIMARY KEY,
        namespaceId TEXT,
        event TEXT
      );
    `);

    storage = new SQLiteStorage(db, serverUrl);
  }

  return storage;
}

export class SQLiteStorage implements StorageInterface {
  private db: Database.Database;
  private serverUrl: string;

  constructor(db: Database.Database, serverUrl: string) {
    this.db = db;
    this.serverUrl = serverUrl;
  }

  async registerNamespace(
    id: string,
    params: {
      fid: number;
      frameAppUrl: string;
      webhookUrl: string;
    }
  ): Promise<NotificationsNamespace> {
    const namespaceUrl = new URL(
      `/notifications/${id}`,
      this.serverUrl
    ).toString();
    const namespace: NotificationsNamespace = {
      id,
      fid: params.fid,
      frameAppUrl: params.frameAppUrl,
      namespaceUrl,
      webhookUrl: params.webhookUrl,
      frame: {
        status: "removed",
      },
    };

    const stmt = this.db.prepare(`
      INSERT INTO notification_settings (id, fid, frameAppUrl, namespaceUrl, webhookUrl, frame)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      params.fid,
      params.frameAppUrl,
      namespace.namespaceUrl,
      params.webhookUrl,
      JSON.stringify(namespace.frame)
    );

    return namespace;
  }

  async getNamespace(id: string): Promise<NotificationsNamespace | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM notification_settings WHERE id = ?
    `);
    const row = stmt.get(id);

    if (!row) {
      return null;
    }

    const namespace = NotificationsNamespaceSchema.parse(row);

    return namespace;
  }

  async addFrame(
    namespace: NotificationsNamespace
  ): Promise<FrameNotificationDetails> {
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

    namespace.frame = {
      status: "added",
      notificationDetails,
    };

    const stmt = this.db.prepare(`
      UPDATE notification_settings
      SET frame = ?
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(namespace.frame), namespace.id);

    return notificationDetails;
  }

  async removeFrame(namespace: NotificationsNamespace): Promise<void> {
    if (namespace.frame.status === "removed") {
      throw new Error("Frame is already removed");
    }

    namespace.frame = {
      status: "removed",
    };

    const stmt = this.db.prepare(`
      UPDATE notification_settings
      SET frame = ?
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(namespace.frame), namespace.id);
  }

  async enableNotifications(
    namespace: NotificationsNamespace
  ): Promise<FrameNotificationDetails> {
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

    namespace.frame.notificationDetails = notificationDetails;

    const stmt = this.db.prepare(`
      UPDATE notification_settings
      SET frame = ?
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(namespace.frame), namespace.id);

    return notificationDetails;
  }

  async disableNotifications(namespace: NotificationsNamespace): Promise<void> {
    if (namespace.frame.status === "removed") {
      throw new Error("Frame is not added");
    }

    namespace.frame.notificationDetails = null;

    const stmt = this.db.prepare(`
      UPDATE notification_settings
      SET frame = ?
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(namespace.frame), namespace.id);
  }

  async recordEvent(namespaceId: string, event: RecordedEvent): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO event_log (id, namespaceId, event)
      VALUES (?, ?, ?)
    `);
    stmt.run(event.id, namespaceId, JSON.stringify(event));
  }

  async listEvents(namespaceId: string): Promise<RecordedEvent[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM event_log WHERE namespaceId = ?
    `);
    const rows = stmt.all(namespaceId);

    const deleteStmt = this.db.prepare(`
      DELETE FROM event_log WHERE namespaceId = ?
    `);
    deleteStmt.run(namespaceId);

    return rows.map((row) => EventLogRowSchema.parse(row).event);
  }
}
