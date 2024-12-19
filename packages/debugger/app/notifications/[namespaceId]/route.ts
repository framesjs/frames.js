import {
  notificationDetailsSchema,
  type SendNotificationRequest,
} from "@farcaster/frame-sdk";
import type { NextRequest } from "next/server";
import { createRedis } from "../../lib/redis";
import { RedisNotificationsStorage } from "../storage";
import { z } from "zod";
import {
  FrameServerEvent,
  InvalidWebhookResponseError,
  sendEvent,
} from "frames.js/farcaster-v2/events";
import { type Hex, hexToBytes } from "viem";

export type NotificationUrl = {
  token: string;
};

export type Notification = Omit<SendNotificationRequest, "tokens">;

const privateKeyParser = z
  .string()
  .min(1)
  .startsWith("0x")
  .transform((val) => hexToBytes(val as Hex));

const postRequestBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_frame"),
    privateKey: privateKeyParser,
  }),
  z.object({
    action: z.literal("remove_frame"),
    privateKey: privateKeyParser,
  }),
  z.object({
    action: z.literal("enable_notifications"),
    privateKey: privateKeyParser,
  }),
  z.object({
    action: z.literal("disable_notifications"),
    privateKey: privateKeyParser,
  }),
]);

export type POSTNotificationsDetailRequestBody = z.input<
  typeof postRequestBodySchema
>;

const postResponseBodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("frame_added"),
    notificationDetails: notificationDetailsSchema,
  }),
  z.object({
    type: z.literal("frame_removed"),
  }),
  z.object({
    type: z.literal("notifications_enabled"),
    notificationDetails: notificationDetailsSchema,
  }),
  z.object({
    type: z.literal("notifications_disabled"),
  }),
]);

export type POSTNotificationsDetailResponseBody = z.infer<
  typeof postResponseBodySchema
>;

/**
 * Handles different operations on namespace level
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { namespaceId: string } }
) {
  const requestBody = postRequestBodySchema.safeParse(await req.json());

  if (!requestBody.success) {
    return Response.json(requestBody.error.flatten(), { status: 400 });
  }

  const redis = createRedis();
  const storage = new RedisNotificationsStorage(redis, req.nextUrl.href);
  const namespace = await storage.getNamespace(params.namespaceId);

  if (!namespace) {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  switch (requestBody.data.action) {
    case "add_frame": {
      const notificationDetails = await storage.addFrame(namespace);

      const eventId = crypto.randomUUID();
      await storage.recordEvent(namespace.id, {
        type: "event",
        event: {
          event: "frame_added",
          notificationDetails,
        },
        id: eventId,
      });

      const event: FrameServerEvent = {
        event: "frame_added",
        notificationDetails,
      };

      sendEvent(event, {
        privateKey: requestBody.data.privateKey,
        fid: namespace.fid,
        webhookUrl: namespace.webhookUrl,
      })
        .then(() => {
          return storage.recordEvent(namespace.id, {
            type: "event_success",
            event,
            eventId,
            id: crypto.randomUUID(),
          });
        })
        .catch(async (e) => {
          return storage.recordEvent(namespace.id, {
            type: "event_failure",
            event,
            eventId,
            id: crypto.randomUUID(),
            message: e instanceof Error ? e.message : String(e),
            response:
              e instanceof InvalidWebhookResponseError
                ? {
                    body: await e.response.text(),
                    headers: Object.fromEntries(e.response.headers.entries()),
                    status: e.response.status,
                  }
                : undefined,
          });
        });

      return Response.json(
        postResponseBodySchema.parse({
          type: "frame_added",
          notificationDetails,
        }),
        { status: 201 }
      );
    }
    case "remove_frame": {
      await storage.removeFrame(namespace);

      const eventId = crypto.randomUUID();
      const event: FrameServerEvent = {
        event: "frame_removed",
      };

      await storage.recordEvent(namespace.id, {
        type: "event",
        event,
        id: eventId,
      });

      sendEvent(event, {
        fid: namespace.fid,
        privateKey: requestBody.data.privateKey,
        webhookUrl: namespace.webhookUrl,
      })
        .then(() => {
          return storage.recordEvent(namespace.id, {
            type: "event_success",
            event,
            eventId,
            id: crypto.randomUUID(),
          });
        })
        .catch(async (e) => {
          return storage.recordEvent(namespace.id, {
            type: "event_failure",
            event,
            eventId,
            id: crypto.randomUUID(),
            message: e instanceof Error ? e.message : String(e),
            response:
              e instanceof InvalidWebhookResponseError
                ? {
                    body: await e.response.text(),
                    headers: Object.fromEntries(e.response.headers.entries()),
                    status: e.response.status,
                  }
                : undefined,
          });
        });

      return Response.json(
        postResponseBodySchema.parse({ type: "frame_removed" }),
        {
          status: 200,
        }
      );
    }
    case "enable_notifications": {
      const notificationDetails = await storage.enableNotifications(namespace);

      const eventId = crypto.randomUUID();
      await storage.recordEvent(namespace.id, {
        type: "event",
        event: {
          event: "notifications_enabled",
          notificationDetails,
        },
        id: eventId,
      });

      const event: FrameServerEvent = {
        event: "notifications_enabled",
        notificationDetails,
      };

      sendEvent(event, {
        fid: namespace.fid,
        privateKey: requestBody.data.privateKey,
        webhookUrl: namespace.webhookUrl,
      })
        .then(() => {
          return storage.recordEvent(namespace.id, {
            type: "event_success",
            event,
            eventId,
            id: crypto.randomUUID(),
          });
        })
        .catch(async (e) => {
          return storage.recordEvent(namespace.id, {
            type: "event_failure",
            event,
            eventId,
            id: crypto.randomUUID(),
            message: e instanceof Error ? e.message : String(e),
            response:
              e instanceof InvalidWebhookResponseError
                ? {
                    body: await e.response.text(),
                    headers: Object.fromEntries(e.response.headers.entries()),
                    status: e.response.status,
                  }
                : undefined,
          });
        });

      return Response.json(
        postResponseBodySchema.parse({
          type: "notifications_enabled",
          notificationDetails,
        }),
        { status: 201 }
      );
    }
    case "disable_notifications": {
      await storage.disableNotifications(namespace);

      const eventId = crypto.randomUUID();
      await storage.recordEvent(namespace.id, {
        type: "event",
        event: {
          event: "notifications_disabled",
        },
        id: eventId,
      });

      const event: FrameServerEvent = {
        event: "notifications_disabled",
      };

      sendEvent(event, {
        fid: namespace.fid,
        privateKey: requestBody.data.privateKey,
        webhookUrl: namespace.webhookUrl,
      })
        .then(() => {
          return storage.recordEvent(namespace.id, {
            type: "event_success",
            event,
            eventId,
            id: crypto.randomUUID(),
          });
        })
        .catch(async (e) => {
          return storage.recordEvent(namespace.id, {
            type: "event_failure",
            event,
            eventId,
            id: crypto.randomUUID(),
            message: e instanceof Error ? e.message : String(e),
            response:
              e instanceof InvalidWebhookResponseError
                ? {
                    body: await e.response.text(),
                    headers: Object.fromEntries(e.response.headers.entries()),
                    status: e.response.status,
                  }
                : undefined,
          });
        });

      return Response.json(
        postResponseBodySchema.parse({ type: "notifications_disabled" }),
        {
          status: 200,
        }
      );
    }
    default: {
      requestBody.data satisfies never;
      throw new Error(`Unknown action`);
    }
  }
}

export const getResponseBodySchema = z.object({
  fid: z.number(),
  frameAppUrl: z.string().url(),
  namespaceUrl: z.string().url(),
  webhookUrl: z.string().url(),
  frame: z.discriminatedUnion("status", [
    z.object({
      status: z.literal("added"),
      notificationDetails: notificationDetailsSchema.nullable(),
    }),
    z.object({
      status: z.literal("removed"),
    }),
  ]),
});

export type GETNotificationsDetailResponseBody = z.infer<
  typeof getResponseBodySchema
>;

/**
 * Gets the namespace settings
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { namespaceId: string } }
): Promise<Response> {
  const redis = createRedis();
  const storage = new RedisNotificationsStorage(redis, req.nextUrl.href);
  const namespace = await storage.getNamespace(params.namespaceId);

  if (!namespace) {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  return Response.json(getResponseBodySchema.parse(namespace), {
    status: 200,
  });
}
