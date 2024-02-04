import { FrameActionPayload, hexStringToUint8Array } from ".";
import { FrameActionMessage, Message } from "@farcaster/core";

/**
 * @returns a Promise that resolves with whether the message signature is valid, by querying a Farcaster hub, as well as the message itself
 */
export async function validateFrameMessage(body: FrameActionPayload): Promise<{
  isValid: boolean;
  message: FrameActionMessage | undefined;
}> {
  const hubBaseUrl =
    process.env.FRAME_HUB_HTTP_URL ||
    process.env.HUB_HTTP_URL ||
    "https://nemes.farcaster.xyz:2281";

  const validateMessageResponse = await fetch(
    `${hubBaseUrl}/v1/validateMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: hexStringToUint8Array(body.trustedData.messageBytes),
    }
  );

  const validateMessageJson = await validateMessageResponse.json();

  if (!validateMessageJson.valid) {
    return {
      isValid: false,
      message: undefined,
    };
  } else {
    return {
      isValid: true,
      message: Message.fromJSON(
        validateMessageJson.message
      ) as FrameActionMessage,
    };
  }
}
