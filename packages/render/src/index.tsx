import type { FrameContext } from "./types";

export const fallbackFrameContext: FrameContext = {
  castId: {
    fid: 1,
    hash: "0x0000000000000000000000000000000000000000" as const,
  },
  connectedAddress: "0x0000000000000000000000000000000000000001",
};

export * from "./frame-ui";
export * from "./types";
export * from "./farcaster";

/** don't export use-frame from here, as it's a client component */
