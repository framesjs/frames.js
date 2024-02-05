import QRCode from "qrcode.react";
import { FarcasterUser } from "../types/farcaster-user";

export const LoginWindow = ({
  farcasterUser,
  loading,
  startFarcasterSignerProcess,
  impersonateUser,
  logout,
}: {
  farcasterUser: FarcasterUser | null;
  loading: boolean;
  startFarcasterSignerProcess: () => void;
  impersonateUser: (opts: { fid: number }) => void;
  logout: () => void;
}) => {
  return (
    <div>
      <div style={{ minWidth: "150px" }}>
        <div>
          {farcasterUser?.status === "approved" ? (
            farcasterUser.fid ? (
              <div>
                Signed in as {farcasterUser?.fid}{" "}
                <button onClick={logout}>Logout</button>
              </div>
            ) : (
              "Something is wrong..."
            )
          ) : farcasterUser?.status === "impersonating" ? (
            <div>
              Impersonating {farcasterUser?.fid}{" "}
              <button onClick={logout}>Logout</button>
            </div>
          ) : farcasterUser?.status === "pending_approval" ? (
            "Approve in Warpcast"
          ) : (
            "Sign in"
          )}
        </div>
        <div>
          {!farcasterUser?.status && (
            <div>
              <button
                style={{
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                onClick={startFarcasterSignerProcess}
                disabled={loading}
              >
                {loading ? "Loading..." : "Sign in with farcaster"}
              </button>
              <div>or</div>
              <form
                action=""
                onSubmit={async (e: any) => {
                  e.preventDefault();
                  const { value: fid } = e.target[0] as HTMLInputElement;
                  impersonateUser({ fid: parseInt(fid) });
                }}
              >
                <input type="text" placeholder="FID to impersonate" />{" "}
                <button
                  style={{
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  type="submit"
                  disabled={loading}
                >
                  Impersonate
                </button>
              </form>
            </div>
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
