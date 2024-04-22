"use client";
import { useFrame } from "@frames.js/render/use-frame";
import { FrameUI, fallbackFrameContext } from "@frames.js/render";
import { FrameImageNext } from "@frames.js/render/next";
import { useAccount } from "wagmi";
import { useEffect, useRef } from "react";
import { useFarcasterIdentity } from "./hooks/use-farcaster-identity";
import { useFarcasterFrameContext } from "./hooks/use-farcaster-context";

// eslint-disable-next-line import/no-default-export -- must be default export
export default function Home({
  searchParams,
}: {
  searchParams: Record<string, string>;
}): JSX.Element {
  const account = useAccount();
  const farcasterIdentity = useFarcasterIdentity();
  const farcasterFrameContext = useFarcasterFrameContext({
    fallbackContext: fallbackFrameContext,
  });

  const frameState = useFrame({
    homeframeUrl: searchParams.url,
    frameActionProxy: "/preview",
    frameGetProxy: "/preview",
    frameContext: farcasterFrameContext.frameContext,
    signerState: farcasterIdentity,
    connectedAddress: account.address,
  });

  const farcasterIdentityRef = useRef(farcasterIdentity);
  farcasterIdentityRef.current = farcasterIdentity;

  useEffect(() => {
    farcasterIdentityRef.current.impersonateUser({ fid: 1 });
  }, []);

  return (
    <main className={`p-2 ${frameState.frame?.status === 'pending' ? 'blur' : ''} min-w-[500px] min-h-[336px]`}>
      <FrameUI frameState={frameState} FrameImage={FrameImageNext} />
    </main>
  );
}
