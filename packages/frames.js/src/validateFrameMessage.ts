import { FrameActionMessage } from "@farcaster/core";
import { validateFrameMessageWithClient } from "./validateFrameMessageWithClient";
import { getHubClient } from "./getHubClient";

export async function validateFrameMessage(body: any): Promise<{
  isValid: boolean;
  message: FrameActionMessage | undefined;
}> {
  const client = getHubClient();
  return validateFrameMessageWithClient(body, client);
}
