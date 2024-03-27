import type { FrameActionPayload, HubHttpUrlOptions } from "./types";
import { hexStringToUint8Array } from "./utils";
import { DEFAULT_HUB_API_KEY, DEFAULT_HUB_API_URL } from "./default";
import { type FrameActionMessage, Message } from "./farcaster";

/**
 * @returns a Promise that resolves with whether the message signature is valid, by querying a Farcaster hub, as well as the message itself
 */
export async function validateFrameMessage(
  body: FrameActionPayload,
  {
    hubHttpUrl = DEFAULT_HUB_API_URL,
    hubRequestOptions = {
      headers: {
        api_key: DEFAULT_HUB_API_KEY,
      },
    },
  }: HubHttpUrlOptions = {}
): Promise<{
  isValid: boolean;
  message: FrameActionMessage | undefined;
}> {
  if (!body) {
    throw new Error(
      "Tried to call validateFrameMessage with no frame action payload. You may be calling it incorrectly on the homeframe"
    );
  }

  const { headers, ...rest } = hubRequestOptions;
  const validateMessageResponse = await fetch(
    `${hubHttpUrl}/v1/validateMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        ...headers,
      },
      body: hexStringToUint8Array(body.trustedData.messageBytes),
      ...rest,
    }
  );

  const validateMessageJson = await validateMessageResponse.json();

  if (validateMessageJson.valid) {
    return {
      isValid: true,
      message: Message.fromJSON(
        validateMessageJson.message
      ) as FrameActionMessage,
    };
  } else {
    return {
      isValid: false,
      message: undefined,
    };
  }
}
