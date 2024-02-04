import { VerificationAddEthAddressMessage } from "@farcaster/core";
import { createPublicClient, http, parseAbi } from "viem";
import { optimism } from "viem/chains";
import { AddressReturnType } from "./types";
import { bytesToHexString } from "./utils";

/**
 * Returns the first verified address for a given `Farcaster` users `fid` if available, falling back to their account custodyAddress
 */
export async function getAddressForFid<
  Options extends { fallbackToCustodyAddress?: boolean } | undefined,
>({
  fid,
  hubClient,
  options = { fallbackToCustodyAddress: true },
}: {
  /** the user's Farcaster fid, found in the FrameActionPayload message `fid` */
  fid: number;
  /** A client for interacting with Farcaster hubs, of type HubRPCClient */
  hubClient: any;
  options?: Options;
}): Promise<AddressReturnType<Options>> {
  const verificationsResult = await hubClient.getVerificationsByFid({
    fid,
  });
  const verifications = verificationsResult.unwrapOr(null);
  if (verifications?.messages[0]) {
    const {
      data: {
        verificationAddEthAddressBody: { address: addressBytes },
      },
    } = verifications.messages[0] as VerificationAddEthAddressMessage;
    return bytesToHexString(addressBytes);
  } else if (options?.fallbackToCustodyAddress) {
    const publicClient = createPublicClient({
      transport: http(),
      chain: optimism,
    });
    // TODO: Do this async
    const address = await publicClient.readContract({
      abi: parseAbi(["function custodyOf(uint256 fid) view returns (address)"]),
      // TODO Extract into constants file
      address: "0x00000000fc6c5f01fc30151999387bb99a9f489b",
      functionName: "custodyOf",
      args: [BigInt(fid)],
    });
    return address;
  } else {
    return null as AddressReturnType<Options>;
  }
}
