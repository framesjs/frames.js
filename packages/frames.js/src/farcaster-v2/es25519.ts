import { sha512 } from "@noble/hashes/sha512";
import { etc, getPublicKey, sign, verify } from "@noble/ed25519";

if (!etc.sha512Sync) {
  etc.sha512Sync = (...m: Uint8Array[]) => sha512(etc.concatBytes(...m));
}

export { getPublicKey, sign, verify };
