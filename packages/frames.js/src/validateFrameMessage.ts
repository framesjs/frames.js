import type { FrameActionPayload, HubHttpUrlOptions } from "./types";
import { hexStringToUint8Array } from "./utils";
import { DEFAULT_HUB_API_KEY, DEFAULT_HUB_API_URL } from "./default";
import type { FrameActionMessage } from "./farcaster";
import { Message } from "./farcaster";

type ValidateMessageJson = {
  valid: boolean;
  message: Message;
};

function isValidateMessageJson(value: unknown): value is ValidateMessageJson {
  if (typeof value !== "object" || !value) {
    return false;
  }

  const validateMessageJson = value as ValidateMessageJson;

  return (
    typeof validateMessageJson.valid === "boolean" &&
    validateMessageJson.valid &&
    typeof validateMessageJson.message === "object"
  );
}

/**
 * Validates a frame action message by querying a Farcaster hub.
 * Verifies the message signature is valid and returns the decoded message.
 *
 * @param body - The frame action payload containing trusted and untrusted data
 * @param options - Optional hub configuration
 * @param options.hubHttpUrl - The Farcaster hub HTTP URL (default: neynar hub)
 * @param options.hubRequestOptions - Additional request options for the hub API
 * @returns A Promise resolving to an object with isValid boolean and the message if valid
 *
 * @example
 * ```typescript
 * const { isValid, message } = await validateFrameMessage(body);
 * if (isValid && message) {
 *   console.log('Valid message from FID:', message.data.fid);
 * }
 * ```
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- just in case
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

  const validateMessageJson: unknown = await validateMessageResponse.json();

  if (!isValidateMessageJson(validateMessageJson)) {
    return {
      isValid: false,
      message: undefined,
    };
  }

  if (validateMessageJson.valid) {
    return {
      isValid: true,
      message: Message.fromJSON(
        validateMessageJson.message
      ) as FrameActionMessage,
    };
  }

  return {
    isValid: false,
    message: undefined,
  };
}
