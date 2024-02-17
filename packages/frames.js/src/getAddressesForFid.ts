import { createPublicClient, http, parseAbi } from "viem";
import { optimism } from "viem/chains";
import { AddressWithType, HubHttpUrlOptions } from "./types";

async function getCustodyAddressForFid(fid: number): Promise<AddressWithType> {
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
  return { address, type: "custody" };
}

/**
 * Returns the first page of verified addresses for a given user fid if available, also includes their custody address as the last element in the array
 */
export async function getAddressesForFid({
  fid,
  options = {},
}: {
  fid: number;
  options?: HubHttpUrlOptions;
}): Promise<{ address: `0x${string}`; type: "verified" | "custody" }[]> {
  const {
    hubHttpUrl = "https://api.neynar.com:2281",
    hubRequestOptions = {
      headers: {
        api_key: "NEYNAR_FRAMES_JS",
      },
    },
  } = options;

  const [verificationsResponse, custodyAddress] = await Promise.all([
    fetch(`${hubHttpUrl}/v1/verificationsByFid?fid=${fid}`, hubRequestOptions),
    getCustodyAddressForFid(fid),
  ]);

  const { messages } = await verificationsResponse.json();
  if (messages) {
    const verifiedAddresses = messages.map((message: any) => {
      const {
        data: {
          verificationAddEthAddressBody: { address },
        },
      } = message;
      return { address, type: "verified" };
    });
    return [...verifiedAddresses, custodyAddress];
  } else {
    return [custodyAddress];
  }
}
