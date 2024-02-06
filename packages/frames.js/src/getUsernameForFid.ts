import { createPublicClient, http, parseAbi } from "viem";
import { optimism } from "viem/chains";
import { UsernameReturnType, HubHttpUrlOptions } from "./types";

/**
 * Returns the first username for a given `Farcaster` users `fid` if available, falling back to an empty string
 */
export async function getUsernameForFid<
  Options extends
    | (HubHttpUrlOptions)
    | undefined,
>({
  fid,
  options = {},
}: {
  /** the user's Farcaster fid, found in the FrameActionPayload message `fid` */
  fid: number;
  options?: Options;
}): Promise<UsernameReturnType> {
  const optionsOrDefaults = {
    hubHttpUrl: options.hubHttpUrl ?? "https://nemes.farcaster.xyz:2281",
  };

  if(!fid || fid === 0) { 
    return null as UsernameReturnType; 
  }

  /** call the hub to retrieve the user's username history */
  const verificationsResponse = await fetch(
    `${optionsOrDefaults.hubHttpUrl}/v1/userDataByFid?fid=${fid}`
  );

  const { messages } = await verificationsResponse.json();
  
  if (messages && messages.length > 0) {
    const username = messages
      .sort((a: any, b: any) => a.data.timestamp >= b.data.timestamp)
      .find((m: any) => {
        return (
          m.data.type === "MESSAGE_TYPE_USER_DATA_ADD" &&
          m.data.userDataBody.type === "USER_DATA_TYPE_USERNAME"
        );
      }).data.userDataBody.value;
      
    return username;
  } else {
    return null as UsernameReturnType;
  }
}
