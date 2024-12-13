import {
  sendNotificationRequestSchema,
  type SendNotificationRequest,
  type SendNotificationResponse,
} from "@farcaster/frame-sdk";
import { NextRequest } from "next/server";
import { createRedis } from "../../lib/redis";
import { NOTIFICATION_TTL_IN_SECONDS } from "../../constants";

export type NotificationUrl = {
  token: string;
};

export type Notification = Omit<SendNotificationRequest, "tokens">;

export async function POST(req: NextRequest): Promise<Response> {
  const redis = createRedis();
  const notificationUrl = req.nextUrl.href;
  const parseResult = sendNotificationRequestSchema.safeParse(await req.json());

  if (!parseResult.success) {
    return Response.json(parseResult.error.flatten(), { status: 400 });
  }

  const settings = await redis.get<NotificationUrl>(notificationUrl);

  if (!settings) {
    return Response.json({ message: "Not Found" }, { status: 404 });
  }

  const { tokens, ...notification } = parseResult.data;

  await redis.lpush<Notification>(notificationUrl + ":list", notification);
  await redis.expire(notificationUrl, NOTIFICATION_TTL_IN_SECONDS);

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

export async function GET(req: NextRequest): Promise<Response> {
  const redis = createRedis();
  const notificationUrl = req.nextUrl.href;

  const notifications = await redis.lpop<Notification>(
    notificationUrl + ":list",
    10
  );

  return Response.json(notifications || [], {
    headers: {
      "Cache-Control": "no-store, no-cache",
    },
  });
}
