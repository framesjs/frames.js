import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEYS } from "../constants";
import type { FrameContextManager, Storage } from "../types";
import type { FarcasterFrameContext } from "../../farcaster";
import { WebStorage } from "../storage";

type FarcasterFrameContextOptions = {
  fallbackContext: FarcasterFrameContext;
  /**
   * @defaultValue WebStorage
   */
  storage?: Storage;
};

export function useFarcasterFrameContext({
  fallbackContext,
  storage,
}: FarcasterFrameContextOptions): FrameContextManager<FarcasterFrameContext> {
  // we use ref so we don't instantiate the storage if user passed their own storage
  const storageRef = useRef(storage ?? new WebStorage());
  const [frameContext, setFrameContext] =
    useState<FarcasterFrameContext | null>(null);

  useEffect(() => {
    storageRef.current
      .getObject<FarcasterFrameContext>(STORAGE_KEYS.FARCASTER_FRAME_CONTEXT)
      .then((data) => {
        if (data) {
          setFrameContext(data);
        }
      })
      .catch((e) => {
        // eslint-disable-next-line no-console -- provide feedback
        console.error(
          "@frames.js/render: Could not load frame context from storage",
          e
        );
      });
  }, []);

  const handleSetFrameContext: FrameContextManager<FarcasterFrameContext>["setFrameContext"] =
    useCallback(async (newFrameContext) => {
      await storageRef.current.setObject<FarcasterFrameContext>(
        STORAGE_KEYS.FARCASTER_FRAME_CONTEXT,
        newFrameContext
      );
      setFrameContext(newFrameContext);
    }, []);

  const resetFrameContext = useCallback(async () => {
    await storageRef.current.delete(STORAGE_KEYS.FARCASTER_FRAME_CONTEXT);
    setFrameContext(null);
  }, []);

  return useMemo(
    () => ({
      frameContext: frameContext || fallbackContext,
      setFrameContext: handleSetFrameContext,
      resetFrameContext,
    }),
    [fallbackContext, frameContext, handleSetFrameContext, resetFrameContext]
  );
}
