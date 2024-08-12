import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  /**
   * @defaultValue "lensFrameContext"
   */
  storageKey?: string;
};

export function useLensFrameContext({
  fallbackContext,
  storage,
  storageKey = "lensFrameContext",
}: LensFrameContextOptions): FrameContextManager<LensFrameContext> {
  // we use ref so we don't instantiate the storage if user passed their own storage
  const storageRef = useRef(storage ?? new WebStorage());
  const [frameContext, setFrameContext] = useState<LensFrameContext | null>(
    null
  );

  useEffect(() => {
    storageRef.current
      .getObject<LensFrameContext>(storageKey)
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
  }, [storageKey]);

  const handleSetFrameContext: FrameContextManager<LensFrameContext>["setFrameContext"] =
    useCallback(
      async (newFrameContext) => {
        await storageRef.current.setObject<LensFrameContext>(
          storageKey,
          newFrameContext
        );
        setFrameContext(newFrameContext);
      },
      [storageKey]
    );

  const resetFrameContext = useCallback(async () => {
    await storageRef.current.delete(storageKey);
    setFrameContext(null);
  }, [storageKey]);

  return useMemo(
    () => ({
      frameContext: frameContext || fallbackContext,
      setFrameContext: handleSetFrameContext,
      resetFrameContext,
    }),
    [frameContext, fallbackContext, handleSetFrameContext, resetFrameContext]
  );
}
