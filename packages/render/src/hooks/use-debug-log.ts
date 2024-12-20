import { useCallback } from "react";
import { useFreshRef } from "./use-fresh-ref";

export function useDebugLog(
  prefix: string,
  enabled: boolean
): typeof console.debug {
  const enabledRef = useFreshRef(enabled);
  const prefixRef = useFreshRef(prefix);

  return useCallback(
    (...args: Parameters<typeof console.debug>) => {
      if (!enabledRef.current) {
        return;
      }

      // eslint-disable-next-line no-console -- provide feedback to the developer
      console.debug(prefixRef.current, ...args);
    },
    [enabledRef, prefixRef]
  );
}
