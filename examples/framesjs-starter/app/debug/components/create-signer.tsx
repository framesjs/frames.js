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
              Impersonating fid (for testing, only works for local frames using
              frames.js to validate messages, as they&apos;re mocked):
              <b>{farcasterUser?.fid}</b>{" "}
              <button onClick={logout}>Logout</button>
            </div>
          ) : farcasterUser?.status === "pending_approval" ? (
            "Approve in Warpcast"
          ) : (
            <h2>Sign in to test buttons</h2>
          )}
        </div>
        <div>
          {!farcasterUser?.status && (
            <div>
              <form
                action=""
                onSubmit={async (e: any) => {
                  e.preventDefault();
                  impersonateUser({ fid: 1 });
                }}
              >
                <button
                  style={{
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  type="submit"
                  disabled={loading}
                >
                  Impersonate fid: 1
                </button>
              </form>
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

              <div>or</div>

              <button
                style={{
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                onClick={startFarcasterSignerProcess}
                disabled={loading}
              >
                {loading
                  ? "Loading..."
                  : "Sign in with farcaster (costs warps once, works with remote frames and other libs)"}
              </button>
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
