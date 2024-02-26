"use client";
/** requires client because signer is stored in local storage */

import { useState, useEffect } from "react";
import { FrameUI, useFrame, fallbackFrameContext } from "frames.js/render";
import { FrameImageNext } from "frames.js/render/next";
import { useFarcasterIdentity } from "./hooks/use-farcaster-identity";
import { FrameDebugger } from "./components/frame-debugger";
import { useRouter } from "next/navigation";
import { MockHubConfig } from "./components/mock-hub-config";

import dynamic from "next/dynamic";
import { type FrameActionHubContext } from "frames.js";
const LoginWindow = dynamic(() => import("./components/create-signer"), {
  ssr: false,
});

export default function Page({
  searchParams,
}: {
  searchParams: Record<string, string>;
}): JSX.Element {
  const router = useRouter();
  const url = searchParams.url ?? null;
  const [urlInput, setUrlInput] = useState(
    url || process.env.NEXT_PUBLIC_HOST || "http://localhost:3000"
  );
  const [mockHubContext, setMockHubContext] = useState<
    Partial<FrameActionHubContext>
  >({
    requesterFollowsCaster: false,
    casterFollowsRequester: false,
    likedCast: false,
    recastedCast: false,
  });
  useEffect(() => {
    if (url !== urlInput && url) {
      setUrlInput(url);
    }
  }, [url]);
  const authState = useFarcasterIdentity();
  const frameState = useFrame({
    homeframeUrl: url,
    frameActionRoute: "/debug/frames",
    frameFetchRoute: "/debug/frames",
    frameContext: fallbackFrameContext,
    authState,
    extraButtonRequestPayload: { mockData: mockHubContext },
  });

  const baseUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";

  return (
    <div className="">
      <div className="">
        <div className="bg-slate-100 mb-4 p-4">
          <div className="flex flex-row gap-4 items-center">
            <h2 className="font-bold">Frames.js debugger</h2>
            <form
              className="flex flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !(
                    urlInput.startsWith("http://") ||
                    urlInput.startsWith("https://")
                  )
                ) {
                  alert("URL must start with http:// or https://");
                  return;
                }
                if (searchParams.url === urlInput) {
                  location.reload();
                }
                router.push(`?url=${encodeURIComponent(urlInput)}`);
              }}
            >
              <input
                type="text"
                name="url"
                className="w-[400px] px-2 py-1 border border-gray-400 rounded-l"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                }}
                placeholder="Enter URL"
              />
              <button className="bg-blue-500 text-white p-2 py-1 rounded-r">
                Debug
              </button>
            </form>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <span>Starter examples:</span>
            <button
              className="underline"
              onClick={(e) => {
                e.preventDefault();
                router.push(`?url=${baseUrl}`);
              }}
            >
              Default
            </button>
            <button
              className="underline"
              onClick={(e) => {
                e.preventDefault();
                router.push(`?url=${baseUrl}/examples/user-data`);
              }}
            >
              User data
            </button>
            <button
              className="underline"
              onClick={(e) => {
                e.preventDefault();
                router.push(`?url=${baseUrl}/examples/multi-page`);
              }}
            >
              Multi-page
            </button>
            <button
              className="underline"
              onClick={(e) => {
                e.preventDefault();
                router.push(`?url=${baseUrl}/examples/mint-button`);
              }}
            >
              Mint button
            </button>
            <button
              className="underline"
              onClick={(e) => {
                e.preventDefault();
                router.push(`?url=${baseUrl}/examples/multi-protocol`);
              }}
            >
              Multi-protocol
            </button>
            <button
              className="underline"
              onClick={(e) => {
                e.preventDefault();
                router.push(`?url=${baseUrl}/examples/slow-request`);
              }}
            >
              Slow request
            </button>
          </div>
          <LoginWindow
            farcasterUser={authState.user}
            loading={authState.isLoading}
            startFarcasterSignerProcess={authState.promptLogin}
            impersonateUser={authState.impersonateUser}
            logout={authState.logout}
          ></LoginWindow>
        </div>
        {url ? (
          <>
            <FrameDebugger frameState={frameState} url={url}>
              <div>
                <FrameUI
                  frameState={frameState}
                  theme={{}}
                  FrameImage={FrameImageNext}
                />
                <div className="mt-4">
                  <h3 className="font-bold">Mock Hub State</h3>
                  <MockHubConfig
                    hubContext={mockHubContext}
                    setHubContext={setMockHubContext}
                  ></MockHubConfig>
                </div>
              </div>
            </FrameDebugger>
          </>
        ) : null}
      </div>
    </div>
  );
}
