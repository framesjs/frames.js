import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEYS } from "../constants";
import type { FrameContextManager, Storage } from "../types";
import { WebStorage } from "../storage";

export type LensFrameContext = {
  pubId: string;
};

type LensFrameContextOptions = {
  fallbackContext: LensFrameContext;
  /**
   * @defaultValue WebStorage
   */
  storage?: Storage;
};

export function useLensFrameContext({
  fallbackContext,
  storage,
}: LensFrameContextOptions): FrameContextManager<LensFrameContext> {
  // we use ref so we don't instantiate the storage if user passed their own storage
  const storageRef = useRef(storage ?? new WebStorage());
  const [frameContext, setFrameContext] = useState<LensFrameContext | null>(
    null
  );

  useEffect(() => {
    storageRef.current
      .getObject<LensFrameContext>(STORAGE_KEYS.LENS_FRAME_CONTEXT)
      .then((storedData) => {
        if (storedData) {
          setFrameContext(storedData);
        }
      })
      .catch((e) => {
        // eslint-disable-next-line no-console -- provide feedback
        console.error(
          "@frames.js/render: Could not get the Lens frame context",
          e
        );
      });
  }, []);

  const handleSetFrameContext: FrameContextManager<LensFrameContext>["setFrameContext"] =
    useCallback(async (newFrameContext) => {
      await storageRef.current.setObject<LensFrameContext>(
        STORAGE_KEYS.LENS_FRAME_CONTEXT,
        newFrameContext
      );
      setFrameContext(newFrameContext);
    }, []);

  const resetFrameContext = useCallback(async () => {
    await storageRef.current.delete(STORAGE_KEYS.LENS_FRAME_CONTEXT);
    setFrameContext(null);
  }, []);

  return useMemo(
    () => ({
      frameContext: frameContext || fallbackContext,
      setFrameContext: handleSetFrameContext,
      resetFrameContext,
    }),
    [frameContext, fallbackContext, handleSetFrameContext, resetFrameContext]
  );
}
