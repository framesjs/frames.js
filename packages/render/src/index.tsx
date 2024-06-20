import type { FarcasterFrameContext } from "./farcaster";

export const fallbackFrameContext: FarcasterFrameContext = {
  castId: {
    fid: 1,
    hash: "0x0000000000000000000000000000000000000000" as const,
  },
  address: "0x0000000000000000000000000000000000000001",
};

export * from "./farcaster";
export * from "./frame-ui";
export * from "./collapsed-frame-ui";
export * from "./types";

/** don't export use-frame from here, as it's a client component */
