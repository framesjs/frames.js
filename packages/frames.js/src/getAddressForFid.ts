import { createPublicClient, http, parseAbi } from "viem";
import { optimism } from "viem/chains";
import { AddressReturnType, HubHttpUrlOptions } from "./types";

/**
 * Returns the first verified address for a given `Farcaster` users `fid` if available, falling back to their account custodyAddress
 */
export async function getAddressForFid<
  Options extends
    | ({ fallbackToCustodyAddress?: boolean } & HubHttpUrlOptions)
    | undefined,
>({
  fid,
  options = {},
}: {
  fid: number;
  options?: Options;
}): Promise<AddressReturnType<Options>> {
  const {
    fallbackToCustodyAddress = true,
    hubHttpUrl = "https://hub-api.neynar.com",
    hubRequestOptions = {
      headers: {
        api_key: "NEYNAR_FRAMES_JS",
      },
    },
  } = options;

  const verificationsResponse = await fetch(
    `${hubHttpUrl}/v1/verificationsByFid?fid=${fid}`,
    hubRequestOptions
  );
  const { messages } = await verificationsResponse.json();
  if (messages[0]) {
    const {
      data: {
        verificationAddEthAddressBody: { address },
      },
    } = messages[0];
    return address;
  } else if (fallbackToCustodyAddress) {
    const publicClient = createPublicClient({
      transport: http(),
      chain: optimism,
    });
    const address = await publicClient.readContract({
      abi: parseAbi(["function custodyOf(uint256 fid) view returns (address)"]),
      // IdRegistry contract address
      address: "0x00000000fc6c5f01fc30151999387bb99a9f489b",
      functionName: "custodyOf",
      args: [BigInt(fid)],
    });
    return address;
  } else {
    return null as AddressReturnType<Options>;
  }
}
