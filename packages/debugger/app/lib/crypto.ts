import * as ed from "@noble/ed25519";

export function convertKeypairToHex({
  privateKeyBytes,
  publicKeyBytes,
}: {
  privateKeyBytes: Uint8Array;
  publicKeyBytes: Uint8Array;
}): {
  publicKey: string;
  privateKey: string;
} {
  return {
    publicKey: "0x" + Buffer.from(publicKeyBytes).toString("hex"),
    privateKey: "0x" + Buffer.from(privateKeyBytes).toString("hex"),
  };
}

export async function createKeypair(): Promise<{
  publicKeyBytes: Uint8Array;
  privateKeyBytes: Uint8Array;
}> {
  // store this securely!
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);

  return {
    privateKeyBytes,
    publicKeyBytes,
  };
}
