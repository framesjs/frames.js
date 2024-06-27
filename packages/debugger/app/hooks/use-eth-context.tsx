import { useState } from "react";

export type EthFrameContext = {};

export function useEthFrameContext({
  fallbackContext,
}: {
  fallbackContext: EthFrameContext;
}) {
  const [frameContext, setFrameContext] = useState<EthFrameContext | null>({});

  function resetFrameContext() {
    setFrameContext(null);
  }

  return {
    frameContext: frameContext || fallbackContext,
    setFrameContext,
    resetFrameContext,
  };
}
