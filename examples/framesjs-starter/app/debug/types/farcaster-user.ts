import type {
  AuthStateInstance,
  FarcasterFrameActionBodyPayload,
} from "frames.js/render";

export interface FarcasterAuthState
  extends AuthStateInstance<
    FarcasterUser | null,
    FarcasterFrameActionBodyPayload
  > {}

export type FarcasterUser = {
  status: "approved" | "pending_approval" | "impersonating";
  signature?: string;
  publicKey: string;
  privateKey: string;
  deadline?: number;
  signerApprovalUrl?: string;
  token?: any;
  fid?: number;
};

export type AuthState = FarcasterAuthState;
