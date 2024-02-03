"use client";

import { Frame } from "frames.js";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { LoginWindow } from "./components/create-signer";
import { FrameRender } from "./components/frame";
import { useFarcasterIdentity } from "./hooks/use-farcaster-identity";
import { createFrameActionMessageWithSignerKey } from "./lib/farcaster";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Page(): JSX.Element {
  const { farcasterUser, loading, startFarcasterSignerProcess, logout } =
    useFarcasterIdentity();
  const params = useSearchParams();
  const url = params.get("url");
  const [frame, setFrame] = useState<Frame | null>(null);

  // Load initial frame
  const { data, error, isLoading } = useSWR<Frame>(
    url ? `/api/og?url=${url}` : null,
    fetcher
  );

  useEffect(() => {
    if (data) setFrame(data);
  }, [data]);

  const submitOption = async ({
    buttonIndex,
    inputText,
  }: {
    buttonIndex: number;
    inputText: string;
  }) => {
    if (!farcasterUser || !farcasterUser.fid || !frame) {
      return;
    }

    const castId = {
      fid: 1,
      hash: new Uint8Array(
        Buffer.from("0000000000000000000000000000000000000000", "hex")
      ),
    };

    const { message, trustedBytes } =
      await createFrameActionMessageWithSignerKey(farcasterUser.privateKey, {
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

  if (error) return <div>Failed to load</div>;
  if (isLoading) return <div>Loading...</div>;
  if (url && !frame) return <div>Something is wrong...</div>;

  return (
    <div className="p-5 flex justify-center flex-col">
      <div className="mx-auto text-center flex flex-col w-full md:w-1/2">
        {!url ? (
          <form action="">
            <input
              type="text"
              name="url"
              value={"http://localhost:3000"}
              placeholder="Enter URL"
              className="w-full p-2"
            />
            <button className="bg-blue-500 text-white p-2 rounded-md">
              Submit
            </button>
          </form>
        ) : (
          <>
            <FrameRender frame={frame!} url={url} submitOption={submitOption} />
            <LoginWindow
              farcasterUser={farcasterUser}
              loading={loading}
              startFarcasterSignerProcess={startFarcasterSignerProcess}
            ></LoginWindow>
          </>
        )}
      </div>
    </div>
  );
}
