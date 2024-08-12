import { createFrameContextHook } from "../create-frame-context-hook";

export type LensFrameContext = {
  pubId: string;
};

export const useLensFrameContext = createFrameContextHook<LensFrameContext>({
  storageKey: "lensFrameContext",
});
