import { CastId, Message } from "@farcaster/core";
import { FrameActionPayload } from "./types";

export function bytesToHexString(bytes: Uint8Array): `0x${string}` {
  return ("0x" + Buffer.from(bytes).toString("hex")) as `0x${string}`;
}

export function hexStringToUint8Array(hexstring: string): Uint8Array {
  return new Uint8Array(
    hexstring.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
  );
}

export function normalizeCastId(castId: CastId): {
  fid: number;
  hash: `0x${string}`;
} {
  return {
    fid: castId.fid,
    hash: bytesToHexString(castId.hash),
  };
}

export function getFrameMessageFromRequestBody(
  body: FrameActionPayload
): Message {
  return Message.decode(
    Buffer.from(body?.trustedData?.messageBytes ?? "", "hex")
  );
}

export function isValidVersion(input: string): boolean {
  // Check if the input is exactly 'vNext'
  if (input === "vNext") {
    return true;
  }

  // Regular expression to match the pattern YYYY-MM-DD
  // ^ asserts position at start of the string
  // \d{4} matches exactly four digits (for the year)
  // - matches the literal "-"
  // \d{2} matches exactly two digits (for the month)
  // - matches the literal "-"
  // \d{2} matches exactly two digits (for the day)
  // $ asserts position at the end of the string
  const pattern = /^\d{4}-\d{2}-\d{2}$/;

  // Test the input against the pattern
  if (!pattern.test(input)) {
    return false;
  }

  return true;
}
