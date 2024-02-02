import {
  FrameActionMessage,
  HubRpcClient,
  getHubRpcClient,
} from "@farcaster/hub-web";
import {
  ValidateFrameMessageOptions,
  validateFrameMessageWithClient,
} from "@framejs/core";

export function getHubClient(): HubRpcClient {
  return getHubRpcClient(
    process.env.FRAME_HUB_URL ||
      process.env.HUB_URL ||
      "nemes.farcaster.xyz:2283",
    {}
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
