import type {
  FarcasterSignerApproved as BaseFarcasterSignerApproved,
  FarcasterSignerImpersonating as BaseFarcasterSignerImpersonating,
  FarcasterSignerPendingApproval as BaseFarcasterSignerPendingApproval,
} from "../../farcaster";

export type FarcasterSignedKeyRequest = {
  deeplinkUrl: string;
  isSponsored: boolean;
  key: string;
  requestFid: number;
  state: string;
  token: string;
  userFid: number;
  signerUser?: Record<string, any>;
  signerUserMetadata?: Record<string, any>;
};

export type FarcasterSignerApproved = BaseFarcasterSignerApproved & {
  _id: number | string;
  signedKeyRequest: FarcasterSignedKeyRequest;
};

export type FarcasterSignerImpersonating = BaseFarcasterSignerImpersonating & {
  _id: number | string;
};

export type FarcasterSignerPendingApproval =
  BaseFarcasterSignerPendingApproval & {
    _id: number | string;
  };

export type FarcasterSigner =
  | FarcasterSignerApproved
  | FarcasterSignerImpersonating
  | FarcasterSignerPendingApproval;

export type FarcasterCreateSignerResult = {
  token: string;
  signerApprovalUrl: string;
};
