export type FarcasterUser =
  | {
      status: "approved" | "pending_approval";
      signature: string;
      publicKey: string;
      privateKey: string;
      deadline: number;
      signerApprovalUrl?: string;
      token?: any;
      fid?: number;
    }
  | {
      status: "impersonating";
      fid: number;
      publicKey: string;
      privateKey: string;
    };
