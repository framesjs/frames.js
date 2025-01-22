export function base64urlEncode(data: Buffer): string {
  // we could use .toString('base64url') on buffer, but that throws in browser
  return data
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function base64urlDecode(encodedData: string): Buffer {
  const encodedChunks = encodedData.length % 4;
  const base64 = encodedData
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(encodedData.length + Math.max(0, 4 - encodedChunks), "=");

  // we could use base64url on buffer, but that throws in browser
  return Buffer.from(base64, "base64");
}
