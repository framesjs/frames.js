import type { FrameActionBodyPayload, SignerStateInstance } from "../types";
import type { FarcasterFrameContext } from "./types";

export type FarcasterSignerState<TSignerType = FarcasterSigner | null> =
  SignerStateInstance<
    TSignerType,
    FrameActionBodyPayload,
    FarcasterFrameContext
  >;

export type FarcasterSignerPendingApproval = {
  status: "pending_approval";
  deadline: number;
  privateKey: string;
  publicKey: string;
  requestFid: number;
  requestSigner: string;
  signature: string;
  signerApprovalUrl: string;
  token: string;
};

export type FarcasterSignerImpersonating = {
  status: "impersonating";
  fid: number;
  privateKey: string;
  publicKey: string;
};

export type FarcasterSignerApproved = {
  status: "approved";
  fid: number;
  privateKey: string;
  publicKey: string;
};

export type FarcasterSigner =
  | FarcasterSignerPendingApproval
  | FarcasterSignerImpersonating
  | FarcasterSignerApproved;

export const mockFarcasterSigner: FarcasterSigner = {
  fid: 1,
  status: "approved",
  publicKey:
    "0x00000000000000000000000000000000000000000000000000000000000000000",
  privateKey:
    "0x00000000000000000000000000000000000000000000000000000000000000000",
};
