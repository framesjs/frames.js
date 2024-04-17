import { useEffect, useState } from "react";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { FarcasterFrameContext } from "@frames.js/render";

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
      setFrameContext(JSON.parse(storedData));
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
