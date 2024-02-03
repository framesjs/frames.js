"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { FrameRender } from "./components/frame";
import { Frame } from "frames.js";
import { createFrameActionMessageWithSignerKey } from "../lib/farcaster";
import {
  FarcasterUser,
  useFarcasterIdentity,
} from "../hooks/use-farcaster-connect";
import QRCode from "qrcode.react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const LoginWindow = ({
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
            farcasterUser?.signer_approval_url && (
              <div className="signer-approval-container mr-4">
                Scan with your camera app
                <QRCode value={farcasterUser.signer_approval_url} size={64} />
                <div className="or-divider">OR</div>
                <a
                  href={farcasterUser.signer_approval_url}
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

export default function Page(): JSX.Element {
  const { farcasterUser, loading, startFarcasterSignerProcess, logout } =
    useFarcasterIdentity();
  const params = useSearchParams();
  const url = params.get("url");
  const [frame, setFrame] = useState<Frame | null>(null);

  const { data, error, isLoading } = useSWR<Frame>(
    `/api/og?url=${url}`,
    fetcher
  );

  useEffect(() => {
    if (data) setFrame(data);
  }, [data]);

  if (error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;
  if (!frame) return <div>something is wrong...</div>;

  const submitOption = async ({
    buttonIndex,
    inputText,
  }: {
    buttonIndex: number;
    inputText: string;
  }) => {
    if (!farcasterUser || !farcasterUser.fid) {
      return;
    }

    const castId = {
      fid: 1,
      hash: new Uint8Array(
        Buffer.from("0000000000000000000000000000000000000000", "hex")
      ),
    };

    const { message, trustedBytes } =
      await createFrameActionMessageWithSignerKey(farcasterUser.private_key, {
        fid: farcasterUser.fid,
        buttonIndex,
        castId,
        url: Buffer.from(frame.postUrl),
        inputText: Buffer.from(inputText),
      });

    if (!message) {
      throw new Error("hub error");
    }

    const response = await fetch(`/api/frame-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        untrustedData: {
          fid: farcasterUser.fid,
          url: frame.postUrl,
          messageHash: `0x${Buffer.from(message.hash).toString("hex")}`,
          timestamp: message.data.timestamp,
          network: 1,
          buttonIndex: Number(message.data.frameActionBody.buttonIndex),
          castId: {
            fid: castId.fid,
            hash: `0x${Buffer.from(castId.hash).toString("hex")}`,
          },
        },
        trustedData: {
          messageBytes: trustedBytes,
        },
      }),
    });
    const data = await response.json();
    setFrame(data);
  };

  return (
    <div className="p-5 flex justify-center flex-col">
      <div className="mx-auto text-center flex flex-col w-full md:w-1/2">
        <FrameRender
          frame={frame}
          url={url}
          submitOption={submitOption}
          viewOnly={!farcasterUser?.fid}
        />
        <LoginWindow
          farcasterUser={farcasterUser}
          loading={loading}
          startFarcasterSignerProcess={startFarcasterSignerProcess}
        ></LoginWindow>
      </div>
    </div>
  );
}
