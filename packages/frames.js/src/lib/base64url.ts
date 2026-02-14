/**
 * Encodes a Buffer to a URL-safe base64 string.
 * Replaces '+' with '-', '/' with '_', and removes padding '='.
 * @param data - The buffer to encode
 * @returns URL-safe base64 encoded string
 */
export function base64urlEncode(data: Buffer): string {
  // we could use .toString('base64url') on buffer, but that throws in browser
  return data
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Decodes a URL-safe base64 string back to a Buffer.
 * Handles the reverse transformations of base64urlEncode.
 * @param encodedData - The URL-safe base64 string to decode
 * @returns Decoded buffer
 */
export function base64urlDecode(encodedData: string): Buffer {
  const encodedChunks = encodedData.length % 4;
  const base64 = encodedData
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(encodedData.length + Math.max(0, 4 - encodedChunks), "=");

  // we could use base64url on buffer, but that throws in browser
  return Buffer.from(base64, "base64");
}

