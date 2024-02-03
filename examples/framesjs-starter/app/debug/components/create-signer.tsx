import QRCode from "qrcode.react";
import { FarcasterUser } from "../types/farcaster-user";

export const LoginWindow = ({
  farcasterUser,
  loading,
  startFarcasterSignerProcess,
}: {
  farcasterUser: FarcasterUser | null;
  loading: boolean;
  startFarcasterSignerProcess: () => void;
}) => {
  return (
    <div>
      <div style={{ minWidth: "150px" }}>
        <div>
          {farcasterUser?.status === "approved"
            ? farcasterUser.fid
              ? `Signed in as ${farcasterUser?.fid}`
              : "Something is wrong..."
            : farcasterUser?.status === "pending_approval"
              ? "Approve in Warpcast"
              : "Sign in"}
        </div>
        <div>
          {!farcasterUser?.status && (
            <button
              style={{
                cursor: loading ? "not-allowed" : "pointer",
              }}
              onClick={startFarcasterSignerProcess}
              disabled={loading}
            >
              {loading ? "Loading..." : "Sign in with farcaster"}
            </button>
          )}
          {farcasterUser?.status === "pending_approval" &&
            farcasterUser?.signerApprovalUrl && (
              <div className="signer-approval-container mr-4">
                Scan with your camera app
                <QRCode value={farcasterUser.signerApprovalUrl} size={64} />
                <div className="or-divider">OR</div>
                <a
                  href={farcasterUser.signerApprovalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button>open url</button>
                </a>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
