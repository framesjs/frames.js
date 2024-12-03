import { createPublicClient, http, parseAbi } from "viem";
import { optimism } from "viem/chains";
import type { JsonObject } from "../core/types";

export class InvalidJFSHeaderError extends Error {}

export class InvalidJFSPayloadError extends Error {}

export class InvalidJFSCompactSignatureError extends Error {}

export class InvalidJFSSignatureError extends Error {}

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
  signMessage: (message: string) => Promise<`0x${string}`>;
};

/**
 * Encodes JSON Farcaster signature
 *
 * @example
 * ```ts
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
): Promise<{
  compact: string;
  json: JSONFarcasterSignatureEncoded;
}> {
  const encodedHeader = encodeHeader(input.fid, input.signer);
  const encodedPayload = encodePayload(input.payload);
  const signature = await input.signMessage(
    `${encodedHeader}.${encodedPayload}`
  );
  const encodedSignature = encodeSignature(signature);

  return {
    compact: `${encodedHeader}.${encodedPayload}.${encodedSignature}`,
    json: {
      header: encodedHeader,
      payload: encodedPayload,
      signature: encodedSignature,
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
  compactSignature: string
): Promise<boolean> {
  const [encodedHeader, encodedPayload, encodedSignature] =
    compactSignature.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new InvalidJFSCompactSignatureError();
  }

  return verify({
    header: encodedHeader,
    payload: encodedPayload,
    signature: encodedSignature,
  });
}

/**
 * Verifies JSON Farcaster Signature
 *
 * @example
 * ```ts
 * const isValid = await verify({
 *  header: "encoded header",
 *  payload: "encoded payload",
 *  signature: "encoded signature",
 * });
 * ```
 */
export async function verify(
  signatureObject: JSONFarcasterSignatureEncoded
): Promise<boolean> {
  const decodedHeader = decodeHeader(signatureObject.header);

  if (decodedHeader.type !== "custody") {
    throw new InvalidJFSHeaderError("Only custody signatures are supported");
  }

  const signature = decodeSignature(signatureObject.signature);
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
      appKey: string;
    };

export function encodeHeader(
  fid: number,
  signer: JSONFarcasterSignatureSigner
): string {
  return Buffer.from(
    JSON.stringify({
      fid,
      type: signer.type,
      key: signer.type === "custody" ? signer.custodyAddress : signer.appKey,
    }),
    "utf-8"
  ).toString("base64url");
}

export function decodeHeader(
  encodedHeader: string
): JSONFarcasterSignatureHeader {
  try {
    const decodedHeader = Buffer.from(encodedHeader, "base64url").toString(
      "utf-8"
    );
    const value: unknown = JSON.parse(decodedHeader);
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
  return Buffer.from(JSON.stringify(data), "utf-8").toString("base64url");
}

export function decodePayload(encodedPayload: string): JsonObject {
  try {
    const decodedPayload = Buffer.from(encodedPayload, "base64url").toString(
      "utf-8"
    );
    const value: unknown = JSON.parse(decodedPayload);

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

export function encodeSignature(signature: `0x${string}`): string {
  return Buffer.from(signature, "utf-8").toString("base64url");
}

export function decodeSignature(signature: string): `0x${string}` {
  try {
    const signatureHash = Buffer.from(signature, "base64url").toString("utf-8");

    if (!signatureHash.startsWith("0x")) {
      throw new InvalidJFSSignatureError();
    }

    return signatureHash as `0x${string}`;
  } catch (e) {
    if (e instanceof InvalidJFSSignatureError) {
      throw e;
    }

    throw new InvalidJFSSignatureError();
  }
}
