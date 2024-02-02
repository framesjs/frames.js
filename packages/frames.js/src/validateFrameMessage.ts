import { FrameActionMessage } from "@farcaster/core";
import { ValidateFrameMessageOptions } from "./types";
import { validateFrameMessageWithClient } from "./validateFrameMessageWithClient";
import { getHubClient } from "./getHubClient";

export async function validateFrameMessage(
  body: any,
  options?: ValidateFrameMessageOptions
): Promise<{
  isValid: boolean;
  message: FrameActionMessage | undefined;
}> {
  const client = getHubClient();
  return validateFrameMessageWithClient(body, client, options);
}
