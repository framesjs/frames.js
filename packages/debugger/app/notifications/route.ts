import type { NextRequest } from "next/server";
import { z } from "zod";
import { createRedis } from "../lib/redis";
import { RedisNotificationsStorage } from "./storage";
import {
  type GETNotificationsDetailResponseBody,
  getResponseBodySchema,
} from "./[namespaceId]/route";

const postRequestBodySchema = z.object({
  fid: z.coerce.number().int().positive(),
  frameAppUrl: z.string().url(),
  webhookUrl: z.string().url(),
});

export type POSTNotificationsRequestBody = z.infer<
  typeof postRequestBodySchema
>;

export type POSTNotificationsResponseBody = GETNotificationsDetailResponseBody;

/**
 * Creates new notification settings namespace.
 *
 * This endpoint should be used to initialize notification settings namespace
 * because it returns a unique URL that is used then to set settings and list all
 * recorded events.
 */
export async function POST(req: NextRequest) {
  const body = postRequestBodySchema.safeParse(await req.json());

  if (!body.success) {
    return Response.json(body.error.flatten(), { status: 400 });
  }

  const redis = createRedis();
  const { fid, frameAppUrl, webhookUrl } = body.data;
  const storage = new RedisNotificationsStorage(redis, req.nextUrl.href);

  // Create new namespace
  const namespaceId = crypto.randomUUID();

  const namespace = await storage.registerNamespace(namespaceId, {
    fid,
    frameAppUrl,
    webhookUrl,
  });

  return Response.json(
    getResponseBodySchema.parse(
      namespace
    ) satisfies POSTNotificationsResponseBody,
    {
      status: 201,
    }
  );
}
