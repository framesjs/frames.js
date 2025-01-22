import type {
  FrameServerEvent,
  EncodedJsonFarcasterSignatureSchema,
} from "@farcaster/frame-core";
import { serverEventSchema } from "@farcaster/frame-core";
import { bytesToHex, type Hex } from "viem";
import { sign, signMessageWithAppKey } from "./json-signature";
import { getPublicKey } from "./es25519";

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
   * Private app key (signer private key)
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
  const appKey = bytesToHex(getPublicKey(privateKey));
  const payload = serverEventSchema.parse(event);
  const signature = await sign({
    fid,
    payload,
    signer: {
      type: "app_key",
      appKey,
    },
    signMessage: signMessageWithAppKey(privateKey),
  });

  const response = await fetch(webhookUrl, {
    method: "POST",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      signature.json satisfies EncodedJsonFarcasterSignatureSchema
    ),
  });

  if (response.ok) {
    return;
  }

  throw new InvalidWebhookResponseError(response.status, response);
}
