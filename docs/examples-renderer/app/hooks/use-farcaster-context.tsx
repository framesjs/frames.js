import { useEffect, useState } from "react";
import type { FarcasterFrameContext } from "@frames.js/render";
import { LOCAL_STORAGE_KEYS } from "../constants";

export function useFarcasterFrameContext({
  fallbackContext,
}: {
  fallbackContext: FarcasterFrameContext;
}) {
  const [frameContext, setFrameContext] =
    useState<FarcasterFrameContext | null>(null);

  useEffect(() => {
    const storedData = localStorage.getItem(
      LOCAL_STORAGE_KEYS.FARCASTER_FRAME_CONTEXT
    );
    if (storedData) {
      setFrameContext(
        JSON.parse(storedData) as unknown as FarcasterFrameContext
      );
    }
  }, []);

  useEffect(() => {
    if (frameContext) {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.FARCASTER_FRAME_CONTEXT,
        JSON.stringify(frameContext)
      );
    }
  }, [frameContext]);

  function resetFrameContext() {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.FARCASTER_FRAME_CONTEXT);
    setFrameContext(null);
  }

  return {
    frameContext: frameContext || fallbackContext,
    setFrameContext,
    resetFrameContext,
  };
}
