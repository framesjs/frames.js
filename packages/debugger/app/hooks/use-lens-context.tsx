import { useEffect, useState } from "react";
import { LOCAL_STORAGE_KEYS } from "../constants";

export type LensFrameContext = {
  profileId: string;
  pubId: string;
};

export function useLensFrameContext({
  fallbackContext,
}: {
  fallbackContext: LensFrameContext;
}) {
  const [frameContext, setFrameContext] = useState<LensFrameContext | null>(
    null
  );

  useEffect(() => {
    const storedData = localStorage.getItem(
      LOCAL_STORAGE_KEYS.LENS_FRAME_CONTEXT
    );
    if (storedData) {
      setFrameContext(JSON.parse(storedData));
    }
  }, []);

  useEffect(() => {
    if (frameContext) {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.LENS_FRAME_CONTEXT,
        JSON.stringify(frameContext)
      );
    }
  }, [frameContext]);

  function resetFrameContext() {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.LENS_FRAME_CONTEXT);
    setFrameContext(null);
  }

  return {
    frameContext: frameContext || fallbackContext,
    setFrameContext,
    resetFrameContext,
  };
}
