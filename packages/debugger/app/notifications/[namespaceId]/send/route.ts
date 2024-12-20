import type { NextRequest } from "next/server";
import {
  sendNotificationResponseSchema,
  SendNotificationResponse,
} from "@farcaster/frame-sdk";
import crypto from "node:crypto";
import { getStorage } from "../../storage";
import { z } from "zod";
import { sendNotificationRequestSchema } from "../../parsers";

const requestBodySchema = sendNotificationRequestSchema.extend({
  targetUrl: z.string().url(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { namespaceId: string } }
) {
  const requestBody = requestBodySchema.safeParse(await req.json());

  if (!requestBody.success) {
    return Response.json(requestBody.error.flatten(), { status: 400 });
  }

  const storage = await getStorage(req.nextUrl.href);
  const namespace = await storage.getNamespace(params.namespaceId);

  if (
    !namespace ||
    namespace.frame.status !== "added" ||
    !namespace.frame.notificationDetails
  ) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await storage.recordEvent(params.namespaceId, {
    type: "notification",
    notification: requestBody.data,
    id: crypto.randomUUID(),
  });

  const notificationDetails = namespace.frame.notificationDetails;
  const tokens = requestBody.data.tokens;

  return Response.json(
    sendNotificationResponseSchema.parse({
      result: {
        invalidTokens: tokens.filter(
          (token) => token !== notificationDetails.token
        ),
        rateLimitedTokens: [],
        successfulTokens: tokens.filter(
          (token) => token === notificationDetails.token
        ),
      },
    } satisfies SendNotificationResponse)
  );
}
