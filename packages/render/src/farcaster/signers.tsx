import type { SignerStateInstance } from "..";

export type FarcasterSignerState = SignerStateInstance<
    FarcasterSigner | null
  >

export interface FarcasterSigner {
  /* the Farcaster signer private key */
  privateKey: string;
  /* the Farcaster signer public key */
  publicKey: string;
  // may be undefined if status is pending_approval
  fid?: number;
  /** The status of the signer */
  status: "approved" | "pending_approval" | "impersonating";
  signature?: string;
  deadline?: number;
  signerApprovalUrl?: string;
  token?: any;
}

export const mockFarcasterSigner: FarcasterSigner = {
  fid: 1,
  status: "approved",
  publicKey:
    "0x00000000000000000000000000000000000000000000000000000000000000000",
  privateKey:
    "0x00000000000000000000000000000000000000000000000000000000000000000",
};
