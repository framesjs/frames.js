import {
  FrameActionPayload,
  HubHttpUrlOptions,
  hexStringToUint8Array,
} from ".";
import { FrameActionMessage, Message } from "@farcaster/core";

/**
 * @returns a Promise that resolves with whether the message signature is valid, by querying a Farcaster hub, as well as the message itself
 */
export async function validateFrameMessage(
  body: FrameActionPayload,
  options?: HubHttpUrlOptions
): Promise<{
  isValid: boolean;
  message: FrameActionMessage | undefined;
}> {
  const optionsOrDefaults = {
    hubHttpUrl: options?.hubHttpUrl || "https://nemes.farcaster.xyz:2281",
    hubRequestOptions: options?.hubRequestOptions ?? {},
  };

  const validateMessageResponse = await fetch(
    `${optionsOrDefaults.hubHttpUrl}/v1/validateMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        ...optionsOrDefaults.hubRequestOptions.headers,
      },
      body: hexStringToUint8Array(body.trustedData.messageBytes),
      ...optionsOrDefaults.hubRequestOptions.headers,
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
