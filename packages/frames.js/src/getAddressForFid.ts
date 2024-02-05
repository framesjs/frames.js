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
  /** the user's Farcaster fid, found in the FrameActionPayload message `fid` */
  fid: number;
  options?: Options;
}): Promise<AddressReturnType<Options>> {
  const optionsOrDefaults = {
    fallbackToCustodyAddress: options.fallbackToCustodyAddress ?? true,
    hubHttpUrl: options.hubHttpUrl ?? "https://nemes.farcaster.xyz:2281",
  };

  const verificationsResponse = await fetch(
    `${optionsOrDefaults.hubHttpUrl}/v1/verificationsByFid?fid=${fid}`
  );
  const { messages } = await verificationsResponse.json();
  if (messages[0]) {
    const {
      data: {
        verificationAddEthAddressBody: { address },
      },
    } = messages[0];
    return address;
  } else if (optionsOrDefaults.fallbackToCustodyAddress) {
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
