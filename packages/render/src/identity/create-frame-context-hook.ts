import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FrameContextManager, Storage } from "./types";
import { WebStorage } from "./storage";

type UseFrameContextOptions<TFrameContext extends Record<string, unknown>> = {
  fallbackContext: TFrameContext;
  /**
   * @defaultValue WebStorage
   */
  storage?: Storage;
  storageKey?: string;
};

type CreateFrameContextHookOptions = {
  storageKey: string;
};

const defaultStorage = new WebStorage();

export function createFrameContextHook<
  TFrameContext extends Record<string, unknown>,
>(options: CreateFrameContextHookOptions) {
  return function useFrameContext({
    fallbackContext,
    storage = defaultStorage,
    storageKey = options.storageKey,
  }: UseFrameContextOptions<TFrameContext>): FrameContextManager<TFrameContext> {
    const storageRef = useRef(storage);
    const [frameContext, setFrameContext] = useState<TFrameContext | null>(
      null
    );

    useEffect(() => {
      storageRef.current
        .get<TFrameContext>(storageKey)
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
    }, [storageKey]);

    const handleSetFrameContext: FrameContextManager<TFrameContext>["setFrameContext"] =
      useCallback(
        async (newFrameContext) => {
          await storageRef.current.set<TFrameContext>(
            storageKey,
            () => newFrameContext
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
      [fallbackContext, frameContext, handleSetFrameContext, resetFrameContext]
    );
  };
}
