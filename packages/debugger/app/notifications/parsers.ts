import {
  sendNotificationRequestSchema as originalSendNotificationRequestSchema,
  notificationDetailsSchema as originalNotificationDetailsSchema,
  serverEventSchema as originalServerEventSchema,
} from "@farcaster/frame-core";
import { z } from "zod";

// in debugger you can use non https
export const sendNotificationRequestSchema =
  originalSendNotificationRequestSchema.extend({
    targetUrl: z.string().url(),
  });

export const notificationDetailsSchema =
  originalNotificationDetailsSchema.extend({
    url: z.string().url(),
  });
