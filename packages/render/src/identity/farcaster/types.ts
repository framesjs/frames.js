import type {
  FarcasterSignerApproved,
  FarcasterSignerImpersonating,
  FarcasterSignerPendingApproval,
} from "../../farcaster";

export interface FarcasterSignedKeyRequest {
  deeplinkUrl: string;
  isSponsored: boolean;
  key: string;
  requestFid: number;
  state: string;
  token: string;
  userFid: number;
  signerUser?: object;
  signerUserMetadata?: object;
}

export type FarcasterSigner = (
  | FarcasterSignerPendingApproval
  | FarcasterSignerImpersonating
  | (FarcasterSignerApproved & { signedKeyRequest: FarcasterSignedKeyRequest })
) & { _id: number };
