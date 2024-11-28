import {
  type FarcasterFrameContext,
  fallbackFrameContext,
} from "@frames.js/render/identity/farcaster";
import type { XmtpFrameContext } from "@frames.js/render/identity/xmtp";
import type { LensFrameContext } from "@frames.js/render/identity/lens";
import type { AnonymousFrameContext } from "@frames.js/render/identity/anonymous";
import { createContext, useContext } from "react";
import { zeroAddress } from "viem";

type FrameContextValue = {
  anonymous: AnonymousFrameContext;
  farcaster: FarcasterFrameContext;
  lens: LensFrameContext;
  xmtp: XmtpFrameContext;
};

const frameContext = createContext<FrameContextValue>({
  anonymous: {},
  farcaster: fallbackFrameContext,
  lens: {
    pubId: "0x01-0x01",
  },
  xmtp: {
    conversationTopic: "test",
    participantAccountAddresses: [zeroAddress],
  },
});

frameContext.displayName = "FrameContext";

const { Provider } = frameContext;

export { Provider as FrameContextProvider };

export function useFrameContext() {
  return useContext(frameContext);
}
