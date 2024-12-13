import { FrameClientConfig } from "@frames.js/render/use-frame-app";
import type { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { createRedis } from "../lib/redis";
import type { NotificationUrl } from "./[id]/route";
import { NOTIFICATION_TTL_IN_SECONDS } from "../constants";

function validateAuth(req: Request) {
  const fid = req.headers.get("x-fid");
  const frameAppUrl = req.headers.get("x-frame-app-url");

  if (!fid || !frameAppUrl) {
    return false;
  }

  return {
    fid,
    frameAppUrl,
  };
}

function getFrameAppNotificationSettingsKey(fid: string, frameAppUrl: string) {
  return `frame-app-notification:${fid}:${frameAppUrl}`;
}

export type NotificationSettings = {
  details: NonNullable<FrameClientConfig["notificationDetails"]>;
  webhookUrl: string;
};

/**
 * Checks for the given notifications settings of user and url
 */
export async function GET(req: NextRequest): Promise<Response> {
  const auth = validateAuth(req);

  if (!auth) {
    return Response.json({ message: "Not Authenticated" }, { status: 401 });
  }

  const redis = createRedis();

  const { fid, frameAppUrl } = auth;
  const key = getFrameAppNotificationSettingsKey(fid, frameAppUrl);

  const settings = await redis.get<NotificationSettings>(key);

  if (!settings) {
    return Response.json({ message: "Not Found" }, { status: 404 });
  }

  return Response.json(settings, {
    headers: {
      "Cache-Control": "no-store, no-cache",
    },
  });
}

const bodySchema = z.object({
  fid: z.coerce.number().int().min(1),
  frameUrl: z.string().url(),
  webhookUrl: z.string().url(),
});

/**
 * Registers notification for the given url and user
 */
export async function POST(req: NextRequest): Promise<Response> {
  const { fid, frameUrl, webhookUrl } = bodySchema.parse(await req.json());
  const redis = createRedis();
  const key = getFrameAppNotificationSettingsKey(fid.toString(), frameUrl);
  const token = crypto.randomUUID();
  const notificationUrl = new URL(`/notifications/${token}`, req.nextUrl.href);

  const settings: NotificationSettings = {
    webhookUrl,
    details: {
      token: crypto.randomUUID(),
      url: notificationUrl.toString(),
    },
  };

  await redis.set<NotificationUrl>(
    notificationUrl.toString(),
    { token },
    {
      ex: NOTIFICATION_TTL_IN_SECONDS,
    }
  );
  const result = await redis.set<NotificationSettings>(key, settings, {
    ex: NOTIFICATION_TTL_IN_SECONDS,
  });

  if (!result) {
    return Response.json(
      { message: "Failed to save settings" },
      { status: 500 }
    );
  }

  //  @todo call webhook?

  return Response.json(settings, { status: 201 });
}
