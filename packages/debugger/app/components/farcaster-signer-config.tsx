"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FarcasterSigner } from "@frames.js/render";
import QRCode from "qrcode.react";

const FarcasterSignerConfig = ({
  farcasterUser,
  loading,
  startFarcasterSignerProcess,
  impersonateUser,
  logout,
}: {
  farcasterUser: FarcasterSigner | null;
  loading: boolean;
  startFarcasterSignerProcess: () => void;
  impersonateUser: (opts: { fid: number }) => void;
  logout?: () => void;
}) => {
  return (
    <div>
      <div>
        <div>
          {farcasterUser?.status === "approved" ? (
            farcasterUser.fid ? (
              <div>
                Signed in as {farcasterUser?.fid}{" "}
                <Button onClick={logout}>Logout</Button>
              </div>
            ) : (
              "Something is wrong..."
            )
          ) : farcasterUser?.status === "impersonating" ? (
            <div className="space-y-2">
              <div>
                Impersonating fid: <b>{farcasterUser?.fid}</b>{" "}
              </div>
              <p>
                <span className=" text-slate-400">
                  *Impersonation only works for testing local frames using
                  frames.js to validate messages, as they&apos;re mocked.
                </span>{" "}
              </p>
              <div>
                <Button
                  variant={"secondary"}
                  className="w-full"
                  onClick={logout}
                >
                  Logout
                </Button>
              </div>
            </div>
          ) : farcasterUser?.status === "pending_approval" ? (
            "Approve in Warpcast"
          ) : (
            <div className="font-bold">Sign in to use buttons</div>
          )}
        </div>

        {!farcasterUser?.status && (
          <div className="border-t pt-4 mt-4">
            <div className="flex flex-col gap-2 pt-2">
              <form
                action=""
                className="flex flex-row"
                onSubmit={async (e: any) => {
                  e.preventDefault();
                  const { value: fid } = e.target[0] as HTMLInputElement;
                  impersonateUser({ fid: parseInt(fid) });
                }}
              >
                <Input type="text" placeholder="FID" defaultValue={"1"} />{" "}
                <Button
                  style={{
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  type="submit"
                  disabled={loading}
                >
                  Impersonate FID
                </Button>
              </form>
              <div className="mx-auto">or</div>
              <Button
                style={{
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                onClick={startFarcasterSignerProcess}
                disabled={loading}
              >
                {loading ? "Loading..." : "Sign in with farcaster"}
              </Button>
              <div>
                (costs warps once, works with remote frames and other libs)
              </div>
            </div>
          </div>
        )}
        {farcasterUser?.status === "pending_approval" &&
          farcasterUser?.signerApprovalUrl && (
            <div className="border-t pt-4 mt-4">
              <div className="signer-approval-container mr-4 flex flex-col gap-2">
                Scan with your camera app
                <QRCode value={farcasterUser.signerApprovalUrl} size={128} />
                <div className="or-divider">OR</div>
                <a
                  href={farcasterUser.signerApprovalUrl}
                  target="_blank"
                  className="underline"
                  rel="noopener noreferrer"
                >
                  <Button>open url</Button>
                </a>
                <hr />
                <Button onClick={logout} variant={"secondary"}>
                  Impersonate instead
                </Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default FarcasterSignerConfig;
