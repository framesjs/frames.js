"use client";

import { Frame, FrameActionPayload } from "frames.js";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { LoginWindow } from "./components/create-signer";
import { FrameRender } from "./components/frame-render";
import { useFarcasterIdentity } from "./hooks/use-farcaster-identity";
import { createFrameActionMessageWithSignerKey } from "./lib/farcaster";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Page({
  searchParams,
}: {
  searchParams: Record<string, string>;
}): JSX.Element {
  const { farcasterUser, loading, startFarcasterSignerProcess, logout } =
    useFarcasterIdentity();
  const url = searchParams.url;
  const [urlInput, setUrlInput] = useState(
    process.env.NEXT_PUBLIC_HOST || "http://localhost:3000"
  );
  const [frame, setFrame] = useState<Frame | null>(null);

  // Load initial frame
  const { data, error, isLoading } = useSWR<Frame>(
    url ? `/debug/og?url=${url}` : null,
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

    const button = frame.buttons![buttonIndex - 1];

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

    const response = await fetch(
      `/debug/frame-action?postType=${button?.action}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          untrustedData: {
            fid: farcasterUser.fid,
            url: url,
            messageHash: `0x${Buffer.from(message.hash).toString("hex")}`,
            timestamp: message.data.timestamp,
            network: 1,
            buttonIndex: Number(message.data.frameActionBody.buttonIndex),
            castId: {
              fid: castId.fid,
              hash: `0x${Buffer.from(castId.hash).toString("hex")}`,
            },
            inputText,
          },
          trustedData: {
            messageBytes: trustedBytes,
          },
        } as FrameActionPayload),
      }
    );

    const data = await response.json();

    if (response.status === 302) {
      const location = data.location;
      if (window.confirm("You are about to be redirected to " + location!)) {
        window.location.href = location!;
      }
      return;
    }

    setFrame(data);
  };

  if (error) return <div>Failed to load</div>;
  if (isLoading) return <div>Loading...</div>;
  if (url && !frame) return <div>Something is wrong...</div>;

  return (
    <div className="p-5 flex justify-center flex-col">
      <div className="mx-auto text-center flex flex-col w-full md:w-1/2">
        {!url ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = `?url=${urlInput}`;
            }}
          >
            <input
              type="text"
              name="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
              }}
              placeholder="Enter URL"
              className="w-full p-2"
            />
            <button className="bg-blue-500 text-white p-2 rounded-md">
              Submit
            </button>
          </form>
        ) : (
          <>
            <FrameRender
              frame={frame!}
              url={url}
              submitOption={submitOption}
              isLoggedIn={!!farcasterUser?.fid}
            />
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
