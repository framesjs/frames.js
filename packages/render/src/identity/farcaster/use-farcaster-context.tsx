import type { FarcasterFrameContext } from "../../farcaster/types";
import { createFrameContextHook } from "../create-frame-context-hook";

export const useFarcasterFrameContext =
  createFrameContextHook<FarcasterFrameContext>({
    storageKey: "farcasterFrameContext",
  });
