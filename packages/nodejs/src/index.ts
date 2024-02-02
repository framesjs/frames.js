import {
  FrameActionMessage,
  HubRpcClient,
  getSSLHubRpcClient,
} from "@farcaster/hub-nodejs";
import {
  ValidateFrameMessageOptions,
  validateFrameMessageWithClient,
} from "@framejs/core";

export function getHubClient(): HubRpcClient {
  return getSSLHubRpcClient(
    process.env.FRAME_HUB_URL ||
      process.env.HUB_URL ||
      "nemes.farcaster.xyz:2283"
  );
}

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
