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
      <div style={{ minWidth: "150px" }} className="mt-4">
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
              Impersonating fid: <b>{farcasterUser?.fid}</b>,{" "}
              <button className="underline" onClick={logout}>
                Logout
              </button>
              <p>
                <span className=" text-slate-400">
                  *Impersonation only works for testing local frames using
                  frames.js to validate messages, as they&apos;re mocked. It
                  uses the `cast.fid` of `1` and `cast.hash` value of
                  `0x00...00` as the frame context in payloads.
                </span>{" "}
              </p>
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
                  className="underline"
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
                  className="underline"
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
                className="underline"
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
                  className="underline"
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
