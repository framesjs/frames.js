import { CastId } from "@farcaster/core";

export function bytesToHexString(bytes: Uint8Array) {
  return ("0x" + Buffer.from(bytes).toString("hex")) as `0x${string}`;
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
export function isValidVersion(input: string) {
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
