import {
  bytesToHex,
  createPublicClient,
  hexToBytes,
  http,
  parseAbi,
} from "viem";
import { optimism } from "viem/chains";
import type { JsonObject } from "../core/types";
import { base64urlDecode, base64urlEncode } from "../lib/base64url";
import { sign as signEd25519, verify as verifyEd25519 } from "./es25519";
import { verifyAppKeyWithNeynar } from "./verify-app-key-with-neynar";
import type { SignMessageFunction, VerifyAppKeyFunction } from "./types";

export class InvalidJFSHeaderError extends Error {}

export class InvalidJFSPayloadError extends Error {}

export class InvalidJFSCompactSignatureError extends Error {}

export class InvalidJFSSignatureError extends Error {
  constructor(public cause: unknown) {
    super();
  }
}

export type JSONFarcasterSignatureHeader = {
  fid: number;
  type: "custody" | "app_key";
  key: `0x${string}`;
};

export type JSONFarcasterSignatureEncoded = {
  header: string;
  payload: string;
  signature: string;
};

/**
 * Generates account association payload that must be signed using encodeJSONFarcasterSignature
 *
 * @example
 * ```ts
 * const signature = await sign({
 *   fid: 1,
 *   signer: {
 *     type: "custody",
 *     custodyAddress: "0x1234567890abcdef1234567890abcdef12345678"
 *   },
 *   payload: constructJSONFarcasterSignatureAccountAssociationPaylod("example.com"),
 *   signMessage: async (message) => {
 *    return account.signMessage({ message });
 *   },
 * });
 * ```
 */
export function constructJSONFarcasterSignatureAccountAssociationPaylod(
  /**
   * The domain must:
   * - match the domain the manifest is being served from
   * - be without protocol (http/https)
   */
  domain: string
): JsonObject {
  return {
    domain,
  };
}

type GenerateJSONFarcasterSignatureInput = {
  fid: number;
  signer: JSONFarcasterSignatureSigner;
  payload: JsonObject;
  signMessage: SignMessageFunction;
};

export type SignResult = {
  compact: string;
  json: JSONFarcasterSignatureEncoded;
};

/**
 * Encodes JSON Farcaster signature
 *
 * @example
 * ```ts
 * // signing domain for frame manifest
 * const signature = await sign({
 *  fid: 1,
 *  signer: {
 *    type: "custody",
 *    custodyAddress: "0x1234567890abcdef1234567890abcdef12345678"
 *  },
 *  payload: {
 *   domain: "example.com"
 *  },
 *  signMessage: async (message) => {
 *    return account.signMessage({ message });
 *  },
 * });
 * ```
 */
export async function sign(
  input: GenerateJSONFarcasterSignatureInput
): Promise<SignResult> {
  const encodedHeader = encodeHeader(input.fid, input.signer);
  const encodedPayload = encodePayload(input.payload);
  const signature = await input.signMessage(
    `${encodedHeader}.${encodedPayload}`
  );
  let base64urlEncodedSignature;

  /**
   * Farcaster seems to encode signatures differently based on signer type.
   *
   * For app_key it uses signature data as bytes, so encoding raw data to base64url
   * For custody it uses signature as hex string, which is then encoded to base64url
   */
  if (input.signer.type === "app_key") {
    base64urlEncodedSignature = encodeSignature(
      Buffer.from(hexToBytes(signature))
    );
  } else {
    base64urlEncodedSignature = encodeSignature(
      Buffer.from(signature, "utf-8")
    );
  }

  return {
    compact: `${encodedHeader}.${encodedPayload}.${base64urlEncodedSignature}`,
    json: {
      header: encodedHeader,
      payload: encodedPayload,
      signature: base64urlEncodedSignature,
    },
  };
}

/**
 * Verifies compact JSON Farcaster Signature
 *
 * @example
 * ```ts
 * const isValid = await verifyCompact("compact json farcaster signature");
 * ```
 */
export async function verifyCompact(
  compactSignature: string,
  options?: {
    verifyAppKey?: VerifyAppKeyFunction;
  }
): Promise<boolean> {
  const [encodedHeader, encodedPayload, encodedSignature] =
    compactSignature.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new InvalidJFSCompactSignatureError();
  }

  return verify(
    {
      header: encodedHeader,
      payload: encodedPayload,
      signature: encodedSignature,
    },
    options
  );
}

/**
 * Verifies JSON Farcaster Signature either signed using custody address or app key
 *
 * @example
 * ```ts
 * const isValid = await verify({
 *  header: "encoded header",
 *  payload: "encoded payload",
 *  signature: "encoded signature",
 * });
 * ```
 *
 * @example
 * ```ts
 * // use custom hub url
 * const isValid = await verify({
 *  header: "encoded header",
 *  payload: "encoded payload",
 *  signature: "encoded signature",
 *  }, {
 *  verifyAppKey: verifyAppKeyWithNeynar({ apiKey: 'api key', hubUrl: "https://hub-api.neynar.com" }),
 * });
 * ```
 */
export async function verify(
  signatureObject: JSONFarcasterSignatureEncoded,
  options: {
    verifyAppKey?: VerifyAppKeyFunction;
  } = {}
): Promise<boolean> {
  const decodedHeader = decodeHeader(signatureObject.header);

  if (decodedHeader.type === "app_key") {
    const signature = base64urlDecode(signatureObject.signature);
    const signedInput = Buffer.from(
      `${signatureObject.header}.${signatureObject.payload}`
    );
    const appKey = hexToBytes(decodedHeader.key);
    const isValid = verifyEd25519(signature, signedInput, appKey);

    if (!isValid) {
      return false;
    }

    const verifyAppKey = options.verifyAppKey ?? verifyAppKeyWithNeynar();

    const appKeyResult = await verifyAppKey(
      decodedHeader.fid,
      decodedHeader.key
    );

    if (!appKeyResult.valid) {
      return false;
    }

    return true;
  }

  const signature = decodeCustodyTypeSignature(signatureObject.signature);
  const publicClient = createPublicClient({
    chain: optimism,
    transport: http(),
  });
  const messageIsValid = await publicClient.verifyMessage({
    address: decodedHeader.key,
    signature,
    message: `${signatureObject.header}.${signatureObject.payload}`,
  });

  if (!messageIsValid) {
    return false;
  }

  const custodyAddressOfFid = await publicClient.readContract({
    abi: parseAbi([
      "function custodyOf(uint256) public view returns (address)",
      "function idOf(address) public view returns (uint256)",
    ]),
    address: "0x00000000Fc6c5F01Fc30151999387Bb99A9f489b",
    functionName: "custodyOf",
    args: [BigInt(decodedHeader.fid)],
  });

  return custodyAddressOfFid === decodedHeader.key;
}

type JSONFarcasterSignatureSigner =
  | {
      type: "custody";
      custodyAddress: `0x${string}`;
    }
  | {
      type: "app_key";
      /**
       * Farcaster signer public key
       */
      appKey: `0x${string}`;
    };

export function encodeHeader(
  fid: number,
  signer: JSONFarcasterSignatureSigner
): string {
  return base64urlEncode(
    Buffer.from(
      JSON.stringify({
        fid,
        type: signer.type,
        key: signer.type === "custody" ? signer.custodyAddress : signer.appKey,
      }),
      "utf-8"
    )
  );
}

export function decodeHeader(
  encodedHeader: string
): JSONFarcasterSignatureHeader {
  try {
    const decodedHeader = base64urlDecode(encodedHeader);
    const value: unknown = JSON.parse(decodedHeader.toString("utf-8"));
    const header: JSONFarcasterSignatureHeader = {
      fid: 0,
      type: "custody",
      key: "0x",
    };

    if (typeof value !== "object") {
      throw new InvalidJFSHeaderError();
    }

    if (value === null) {
      throw new InvalidJFSHeaderError();
    }

    if ("fid" in value && typeof value.fid === "number" && value.fid > 0) {
      header.fid = value.fid;
    } else {
      throw new InvalidJFSHeaderError();
    }

    if (
      "type" in value &&
      typeof value.type === "string" &&
      ["custody", "app_key"].includes(value.type)
    ) {
      header.type = value.type as JSONFarcasterSignatureHeader["type"];
    } else {
      throw new InvalidJFSHeaderError();
    }

    if (
      "key" in value &&
      typeof value.key === "string" &&
      value.key.startsWith("0x") &&
      value.key.length > 2
    ) {
      header.key = value.key as JSONFarcasterSignatureHeader["key"];
    } else {
      throw new InvalidJFSHeaderError();
    }

    return header;
  } catch (e) {
    if (e instanceof InvalidJFSHeaderError) {
      throw e;
    }

    throw new InvalidJFSHeaderError();
  }
}

export function encodePayload(data: JsonObject): string {
  return base64urlEncode(Buffer.from(JSON.stringify(data), "utf-8"));
}

export function decodePayload(encodedPayload: string): JsonObject {
  try {
    const decodedPayload = base64urlDecode(encodedPayload);
    const value: unknown = JSON.parse(decodedPayload.toString("utf-8"));

    if (typeof value !== "object") {
      throw new InvalidJFSPayloadError();
    }

    if (value === null) {
      throw new InvalidJFSPayloadError();
    }

    return value as JsonObject;
  } catch (e) {
    if (e instanceof InvalidJFSPayloadError) {
      throw e;
    }

    throw new InvalidJFSPayloadError();
  }
}

export function encodeSignature(signature: Buffer): string {
  return base64urlEncode(signature);
}

export function decodeAppKeyTypeSignature(signature: string): `0x${string}` {
  try {
    return bytesToHex(base64urlDecode(signature));
  } catch (e) {
    throw new InvalidJFSSignatureError(e);
  }
}

export function decodeCustodyTypeSignature(signature: string): `0x${string}` {
  try {
    const decoded = base64urlDecode(signature).toString("utf-8");

    if (!decoded.startsWith("0x")) {
      throw new Error("Invalid signature, must contain hex text");
    }

    return decoded as `0x${string}`;
  } catch (e) {
    throw new InvalidJFSSignatureError(e);
  }
}

/**
 * Signs message using app key
 *
 * @example
 * ```ts
 * await sign({
 *  fid: 1,
 *  signer: {
 *    type: "app_key",
 *    appKey: "0x000000000000000000000000" // signer public key
 *  },
 *  payload: {
 *    any: 10,
 *  },
 *  signMessage: signMessageWithAppKey(
 *   // signer private key
 *   "0x000000000000000000000000000000"
 *   ),
 * })
 * ```
 */
export function signMessageWithAppKey(
  privateKey: `0x${string}` | Uint8Array
): SignMessageFunction {
  return (message) => {
    const signature = signEd25519(
      Buffer.from(message, "utf-8"),
      typeof privateKey === "string" ? hexToBytes(privateKey) : privateKey
    );

    return Promise.resolve(bytesToHex(signature));
  };
}
