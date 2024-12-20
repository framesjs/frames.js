import type {
  FrameServerEvent,
  EncodedJsonFarcasterSignatureSchema,
} from "@farcaster/frame-core";
import { serverEventSchema } from "@farcaster/frame-core";
import {
  createJsonFarcasterSignature,
  hexToBytes,
} from "@farcaster/frame-node";
import type { Hex } from "viem";

export class InvalidWebhookResponseError extends Error {
  constructor(
    public statusCode: number,
    public response: Response
  ) {
    super("Invalid webhook response");
  }
}

export type { FrameServerEvent };

type SendEventOptions = {
  /**
   * App private key
   */
  privateKey: Hex | Uint8Array;
  fid: number;
  webhookUrl: string | URL;
};

/**
 * Sends an event to frame app webhook.
 */
export async function sendEvent(
  event: FrameServerEvent,
  { privateKey, fid, webhookUrl }: SendEventOptions
): Promise<void> {
  const payload = serverEventSchema.parse(event);
  const signature = createJsonFarcasterSignature({
    fid,
    payload: Buffer.from(JSON.stringify(payload)),
    privateKey:
      typeof privateKey === "string" ? hexToBytes(privateKey) : privateKey,
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
