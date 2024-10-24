import type { FarcasterFrameContext } from "./farcaster/types";

export const fallbackFrameContext: FarcasterFrameContext = {
  castId: {
    fid: 1,
    hash: "0x0000000000000000000000000000000000000000" as const,
  },
  address: "0x0000000000000000000000000000000000000001",
};
