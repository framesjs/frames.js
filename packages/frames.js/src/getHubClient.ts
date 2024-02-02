import { HubRpcClient, getSSLHubRpcClient } from "@farcaster/hub-nodejs";

export function getHubClient(): HubRpcClient {
  return getSSLHubRpcClient(
    process.env.FRAME_HUB_URL ||
      process.env.HUB_URL ||
      "nemes.farcaster.xyz:2283"
  );
}
