import type { NextRequest } from "next/server";
import { z } from "zod";
import { serverEventSchema } from "@farcaster/frame-sdk";
import { getStorage } from "../../storage";
import { sendNotificationRequestSchema } from "../../parsers";

const getEventsResponseBodySchema = z.array(
  z.discriminatedUnion("type", [
    z.object({
      id: z.string().uuid(),
      type: z.literal("notification"),
      notification: sendNotificationRequestSchema,
    }),
    z.object({
      id: z.string().uuid(),
      type: z.literal("event"),
      event: serverEventSchema,
    }),
    z.object({
      id: z.string().uuid(),
      type: z.literal("event_success"),
      eventId: z.string().uuid(),
      event: serverEventSchema,
    }),
    z.object({
      id: z.string().uuid(),
      type: z.literal("event_failure"),
      event: serverEventSchema,
      eventId: z.string().uuid(),
      message: z.string(),
      response: z
        .object({
          status: z.number(),
          headers: z.record(z.union([z.string(), z.array(z.string())])),
          body: z.string(),
        })
        .optional(),
    }),
  ])
);

export type GETEventsResponseBody = z.infer<typeof getEventsResponseBodySchema>;

export async function GET(
  req: NextRequest,
  { params }: { params: { namespaceId: string } }
) {
  const storage = await getStorage(req.nextUrl.href);
  const events = await storage.listEvents(params.namespaceId);

  return Response.json(
    getEventsResponseBodySchema.parse(events satisfies GETEventsResponseBody)
  );
}
