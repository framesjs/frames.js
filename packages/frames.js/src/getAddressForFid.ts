import { VerificationAddEthAddressMessage } from "@farcaster/core";
import { createPublicClient, http, parseAbi } from "viem";
import { optimism } from "viem/chains";
import { AddressReturnType } from "./types";
import { bytesToHexString } from "./utils";

export async function getAddressForFid<
  Options extends { fallbackToCustodyAddress?: boolean } | undefined,
>({
  fid,
  hubClient,
  options,
}: {
  fid: number;
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
