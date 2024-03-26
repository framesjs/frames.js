import { FrameContext } from "./types.js";

export const fallbackFrameContext: FrameContext = {
  castId: {
    fid: 1,
    hash: "0x0000000000000000000000000000000000000000" as const,
  },
  connectedAddress: "0x0000000000000000000000000000000000000001",
};

export * from "./frame-ui.js";
export * from "./types.js";
export * from "./farcaster/index.js";

/** don't export use-frame from here, as it's a client component */
