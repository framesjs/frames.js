import { AbiParameters } from "ox";
import { z } from "zod";
import type { VerifyAppKeyFunction } from "./types";

class VerifyAppKeyWithNeynarError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
  }
}

type VerifyAppKeyWithNeynarOptions = {
  /**
   * @defaultValue process.env.NEYNAR_API_KEY
   */
  apiKey?: string;
  /**
   * @defaultValue "https://hub-api.neynar.com"
   */
  hubUrl?: string;
};

export function verifyAppKeyWithNeynar({
  apiKey = process.env.NEYNAR_API_KEY,
  hubUrl = "https://hub-api.neynar.com",
}: VerifyAppKeyWithNeynarOptions = {}): VerifyAppKeyFunction {
  if (!apiKey) {
    throw new Error(
      "verifyAppKeyWithNeynar requires appKey to be passed in or set as an environment variable NEYNAR_API_KEY"
    );
  }

  const verifier = createVerifyAppKeyWithHub(hubUrl, {
    headers: {
      "x-api-key": apiKey,
    },
    cache: "no-cache",
  });

  return verifier;
}

export const signedKeyRequestAbi = [
  {
    components: [
      {
        name: "requestFid",
        type: "uint256",
      },
      {
        name: "requestSigner",
        type: "address",
      },
      {
        name: "signature",
        type: "bytes",
      },
      {
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "SignedKeyRequest",
    type: "tuple",
  },
] as const;

const hubResponseSchema = z.object({
  events: z.array(
    z.object({
      signerEventBody: z.object({
        key: z.string(),
        metadata: z.string(),
      }),
    })
  ),
});

function createVerifyAppKeyWithHub(
  hubUrl: string,
  requestOptions: RequestInit
): VerifyAppKeyFunction {
  return async (fid, appKey) => {
    const url = new URL("/v1/onChainSignersByFid", hubUrl);
    url.searchParams.append("fid", fid.toString());

    const response = await fetch(url, requestOptions);

    if (response.status !== 200) {
      throw new VerifyAppKeyWithNeynarError(
        "Error fetching from Hub API, non-200 status code received",
        await response.text()
      );
    }

    const parsedResponse = hubResponseSchema.safeParse(await response.json());

    if (parsedResponse.error) {
      throw new VerifyAppKeyWithNeynarError(
        "Error parsing Hub response",
        parsedResponse.error
      );
    }

    const appKeyLower = appKey.toLowerCase();

    const signerEvent = parsedResponse.data.events.find(
      (event) => event.signerEventBody.key.toLowerCase() === appKeyLower
    );

    if (!signerEvent) {
      return { valid: false };
    }

    const decoded = AbiParameters.decode(
      signedKeyRequestAbi,
      Buffer.from(signerEvent.signerEventBody.metadata, "base64")
    );

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- on type level this returns a tuple
    if (decoded.length !== 1) {
      throw new VerifyAppKeyWithNeynarError("Error decoding metadata");
    }

    const appFid = Number(decoded[0].requestFid);

    return { valid: true, appFid };
  };
}
