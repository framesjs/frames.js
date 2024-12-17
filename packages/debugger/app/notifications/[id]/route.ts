import {
  sendNotificationRequestSchema,
  type SendNotificationRequest,
  type SendNotificationResponse,
} from "@farcaster/frame-sdk";
import type { NextRequest } from "next/server";
import { createRedis } from "../../lib/redis";
import { validateAuth } from "../auth";
import { RedisNotificationsStorage } from "../storage";

export type NotificationUrl = {
  token: string;
};

export type Notification = Omit<SendNotificationRequest, "tokens">;

/**
 * Records notifications sent from frame app, marks them all as successful
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const redis = createRedis();
  const notificationsUrl = new URL(
    `/notifications/${params.id}`,
    req.nextUrl.href
  );
  const parseResult = sendNotificationRequestSchema.safeParse(await req.json());

  if (!parseResult.success) {
    return Response.json(parseResult.error.flatten(), { status: 400 });
  }

  const storage = new RedisNotificationsStorage({
    redis,
  });

  const { tokens, ...notification } = parseResult.data;

  await storage.recordNotification(notificationsUrl.toString(), notification);

  return Response.json(
    {
      result: {
        successfulTokens: tokens,
        invalidTokens: [],
        rateLimitedTokens: [],
      },
    } satisfies SendNotificationResponse,
    { status: 200 }
  );
}

/**
 * Gets the recorded notifications
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const redis = createRedis();
  const notificationsUrl = new URL(
    `/notifications/${params.id}`,
    req.nextUrl.href
  );
  const storage = new RedisNotificationsStorage({
    redis,
  });

  const notifications = await storage.listNotifications(
    notificationsUrl.toString()
  );

  return Response.json(notifications, {
    headers: {
      "Cache-Control": "no-store, no-cache",
    },
  });
}

/**
 * Disables notifications for the given frame app
 */
export async function DELETE(req: NextRequest) {
  const auth = validateAuth(req);

  if (!auth) {
    return Response.json({ message: "Not Authenticated" }, { status: 401 });
  }

  const redis = createRedis();
  const storage = new RedisNotificationsStorage({
    redis,
  });

  // @todo call webhook with disable notifications event

  await storage.disableNotifications({
    fid: auth.fid,
    frameAppUrl: auth.frameAppUrl,
  });

  return new Response(undefined, { status: 204 });
}
