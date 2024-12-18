import type {
  EncodedJsonFarcasterSignatureSchema,
  FrameEvent,
} from "@farcaster/frame-node";
import {
  createJsonFarcasterSignature,
  eventPayloadSchema,
} from "@farcaster/frame-node";

export class InvalidWebhookResponseError extends Error {
  constructor(
    public statusCode: number,
    public response: Response
  ) {
    super("Invalid webhook response");
  }
}

export type { FrameEvent };

type SendEventOptions = {
  /**
   * App private key
   */
  privateKey: string | Uint8Array;
  fid: number;
  webhookUrl: string | URL;
};

/**
 * Sends an event to frame app webhook.
 */
export async function sendEvent(
  event: FrameEvent,
  { privateKey, fid, webhookUrl }: SendEventOptions
): Promise<void> {
  const payload = eventPayloadSchema.parse(event);
  const signature = createJsonFarcasterSignature({
    fid,
    payload: Buffer.from(JSON.stringify(payload)),
    privateKey: Buffer.from(privateKey),
    type: "app_key",
  });

  const response = await fetch(webhookUrl, {
    method: "POST",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      signature satisfies EncodedJsonFarcasterSignatureSchema
    ),
  });

  if (response.status >= 200 && response.status < 300) {
    return;
  }

  throw new InvalidWebhookResponseError(response.status, response);
}
