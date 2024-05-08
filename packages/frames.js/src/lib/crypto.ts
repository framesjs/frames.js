import { Buffer } from "node:buffer";
import type { webcrypto } from "node:crypto";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- we need this
  namespace globalThis {
    // eslint-disable-next-line no-var -- we need this
    var EdgeRuntime: string | undefined;
  }
}

async function getCryptoImplementation(): Promise<Crypto | webcrypto.Crypto> {
  /**
   * Vercel edge runtime by default provides crypto globally
   * In node runtime we will import the crypto module even if it is globally available in node \>= 19
   */
  if (typeof EdgeRuntime !== "string") {
    return import("node:crypto").then((mod) => mod.webcrypto);
  }

  return crypto;
}

async function createKey(secret: string): Promise<CryptoKey> {
  const crypto = await getCryptoImplementation();

  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createHMACSignature(
  data: string,
  secret: string
): Promise<Buffer> {
  const crypto = await getCryptoImplementation();
  const secretKey = await createKey(secret);

  return crypto.subtle
    .sign(
      {
        name: "HMAC",
      },
      secretKey,
      Buffer.from(data)
    )
    .then((arrayBuffer) => Buffer.from(new Uint8Array(arrayBuffer)));
}

export async function verifyHMACSignature(
  data: string,
  signature: Buffer,
  secret: string
): Promise<boolean> {
  const crypto = await getCryptoImplementation();
  const secretKey = await createKey(secret);

  return crypto.subtle.verify(
    {
      name: "HMAC",
    },
    secretKey,
    signature,
    Buffer.from(data)
  );
}
