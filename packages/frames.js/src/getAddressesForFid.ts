import { createPublicClient, http, parseAbi } from "viem";
import { optimism } from "viem/chains";
import { AddressWithType, HubHttpUrlOptions } from "./types";
import { DEFAULT_HUB_API_KEY, DEFAULT_HUB_API_URL } from "./default";
import { Message } from "./farcaster";

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
}): Promise<AddressWithType[]> {
  const {
    hubHttpUrl = DEFAULT_HUB_API_URL,
    hubRequestOptions = {
      headers: {
        api_key: DEFAULT_HUB_API_KEY,
      },
    },
  } = options;

  const [verificationsResponse, custodyAddress] = await Promise.all([
    fetch(`${hubHttpUrl}/v1/verificationsByFid?fid=${fid}`, hubRequestOptions),
    getCustodyAddressForFid(fid),
  ]);

  const { messages } = (await verificationsResponse
    .clone()
    .json()
    .catch(async () => {
      // body has not been
      throw new Error(
        `Failed to parse response body as JSON because server hub returned response with status "${verificationsResponse.status}" and body "${await verificationsResponse.clone().text()}"`
      );
    })) as { messages?: Message[] };

  if (messages) {
    const verifiedAddresses = messages.map((message) => {
      const {
        data: {
          // @ts-expect-error this is correct but somehow the property is not defined on MessageData
          verificationAddEthAddressBody: { address },
        },
      } = message;

      return { address, type: "verified" } as AddressWithType;
    });
    return [...verifiedAddresses, custodyAddress];
  } else {
    return [custodyAddress];
  }
}
