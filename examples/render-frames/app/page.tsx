"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { FrameRender } from "./components/frame";
import { Frame } from "frames.js";
import { createFrameActionMessage } from "./lib/farcaster";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Page(): JSX.Element {
  const params = useSearchParams();
  const url = params.get("url");
  const [frame, setFrame] = useState<Frame | null>(null);
  const [privateKeyInput, setPrivateKeyInput] = useState<string>("");
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR<Frame>(
    `/api/og?url=${url}`,
    fetcher
  );

  useEffect(() => {
    if (data) setFrame(data);
  }, [data]);

  useEffect(() => {
    if (localStorage.getItem("privateKey")) {
      setPrivateKey(localStorage.getItem("privateKey"));
    }
  }, []);

  if (error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;
  if (!frame) return <div>something is wrong...</div>;

  const submitOption = async (buttonIndex: number) => {
    const farcasterUser = {
      fid: 1689,
    };

    const castId = {
      fid: 1,
      hash: new Uint8Array(
        Buffer.from("0000000000000000000000000000000000000000", "hex")
      ),
    };

    const { message, trustedBytes } = await createFrameActionMessage({
      fid: farcasterUser.fid,
      buttonIndex,
      castId,
      url: Buffer.from(frame.postUrl),
      inputText: Buffer.from(""),
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
          viewOnly={privateKey === null}
        />
        {!privateKey && (
          <div>
            <div>Load private key</div>
            <input
              type="text"
              value={privateKeyInput}
              onChange={(e) => setPrivateKeyInput(e.target.value)}
              placeholder="Private key..."
            />
            <button
              onClick={() => {
                setPrivateKey(privateKeyInput);
                localStorage.setItem("privateKey", privateKeyInput);
              }}
            >
              Load
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
