import { FrameActionMessage } from "@farcaster/core";
import { validateFrameMessageWithClient } from "./validateFrameMessageWithClient";
import { getHubClient } from "./getHubClient";
import { FrameActionPayload } from ".";

export async function validateFrameMessage(body: FrameActionPayload): Promise<{
  isValid: boolean;
  message: FrameActionMessage | undefined;
}> {
  const client = getHubClient();
  return validateFrameMessageWithClient(body, client);
}
