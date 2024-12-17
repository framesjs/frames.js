import type { NextRequest } from "next/server";
import { z } from "zod";
import { createRedis } from "../lib/redis";
import { validateAuth } from "./auth";
import type { NotificationSettings } from "./types";
import { RedisNotificationsStorage } from "./storage";
import { createNotificationsUrl } from "./helpers";

/**
 * Checks for the given notifications settings of user and url
 */
export async function GET(req: NextRequest): Promise<Response> {
  const auth = validateAuth(req);

  if (!auth) {
    return Response.json({ message: "Not Authenticated" }, { status: 401 });
  }

  const redis = createRedis();
  const storage = new RedisNotificationsStorage({
    redis,
  });

  const settings = await storage.getSettings({
    fid: auth.fid,
    frameAppUrl: auth.frameAppUrl,
  });

  if (!settings) {
    return Response.json({ message: "Not Found" }, { status: 404 });
  }

  return Response.json(settings, {
    headers: {
      "Cache-Control": "no-store, no-cache",
    },
  });
}

export type CreateNotificationSettings = Extract<
  NotificationSettings,
  { enabled: true }
>;

const bodySchema = z.object({
  webhookUrl: z.string().url(),
});

/**
 * Adds frame app to client
 */
export async function POST(req: NextRequest): Promise<Response> {
  const auth = validateAuth(req);

  if (!auth) {
    return Response.json({ message: "Not Authenticated" }, { status: 401 });
  }

  const { webhookUrl } = bodySchema.parse(await req.json());
  const redis = createRedis();
  const notificationsUrl = createNotificationsUrl(req);

  const storage = new RedisNotificationsStorage({
    redis,
  });

  const existingSettings = await storage.getSettings({
    fid: auth.fid,
    frameAppUrl: auth.frameAppUrl,
  });

  if (existingSettings?.enabled) {
    return Response.json(
      { message: "Notifications are already enabled" },
      { status: 409 }
    );
  }

  const settings = await storage.addFrame({
    fid: auth.fid,
    frameAppUrl: auth.frameAppUrl,
    notificationsUrl,
    webhookUrl,
  });

  if (existingSettings) {
    // @todo call webhook with enable notifications event
  } else {
    // @todo call webhook with add frame event
  }

  return Response.json(settings, { status: existingSettings ? 200 : 201 });
}

/**
 * Removes frame app from client
 */
export async function DELETE(req: NextRequest): Promise<Response> {
  const auth = validateAuth(req);

  if (!auth) {
    return Response.json({ message: "Not Authenticated" }, { status: 401 });
  }

  const redis = createRedis();
  const storage = new RedisNotificationsStorage({
    redis,
  });

  // @todo call webhook with remove frame event

  await storage.removeFrame({
    fid: auth.fid,
    frameAppUrl: auth.frameAppUrl,
  });

  return new Response(undefined, { status: 204 });
}
