"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FarcasterSigner } from "@frames.js/render";
import QRCode from "qrcode.react";

const LoginWindow = ({
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
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={
            (!farcasterUser || farcasterUser.status === "pending_approval") &&
            !loading
              ? "destructive"
              : "outline"
          }
        >
          {farcasterUser?.status === "impersonating"
            ? `Impersonating fid ${farcasterUser.fid}`
            : farcasterUser?.status === "approved"
              ? `Authed as fid ${farcasterUser.fid}`
              : "⚠️ Not signed in"}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div>
          <div>
            <div className="border-b pb-2">
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
                <div>
                  Impersonating fid: <b>{farcasterUser?.fid}</b>,{" "}
                  <Button onClick={logout}>Logout</Button>
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
                <h2>Sign in use buttons</h2>
              )}
            </div>
            <div>
              {!farcasterUser?.status && (
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
              )}
              {farcasterUser?.status === "pending_approval" &&
                farcasterUser?.signerApprovalUrl && (
                  <div className="signer-approval-container mr-4 flex flex-col gap-2">
                    Scan with your camera app
                    <QRCode
                      value={farcasterUser.signerApprovalUrl}
                      size={128}
                    />
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
                )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LoginWindow;
