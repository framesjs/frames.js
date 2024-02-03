export type FarcasterUser = {
  signature: string;
  publicKey: string;
  privateKey: string;
  deadline: number;
  status: "approved" | "pending_approval";
  signerApprovalUrl?: string;
  token?: any;
  fid?: number;
};
