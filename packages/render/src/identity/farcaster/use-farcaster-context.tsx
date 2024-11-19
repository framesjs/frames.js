import type { FarcasterFrameContext } from "../../farcaster/types";
import { createFrameContextHook } from "../create-frame-context-hook";

export const useFarcasterFrameContext =
  createFrameContextHook<FarcasterFrameContext>({
    storageKey: "farcasterFrameContext",
  });

export const fallbackFrameContext: FarcasterFrameContext = {
  castId: {
    fid: 1,
    hash: "0x0000000000000000000000000000000000000000" as const,
  },
};
