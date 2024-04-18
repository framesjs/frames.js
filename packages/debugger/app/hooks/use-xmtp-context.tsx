import { useEffect, useState } from "react";
import { LOCAL_STORAGE_KEYS } from "../constants";

export type XmtpFrameContext = {
  conversationTopic: string;
  participantAccountAddresses: `0x${string}`[];
  groupId?: Uint8Array;
  groupSecret?: Uint8Array;
};

export function useXmtpFrameContext({
  fallbackContext,
}: {
  fallbackContext: XmtpFrameContext;
}) {
  const [frameContext, setFrameContext] = useState<XmtpFrameContext | null>(
    null
  );

  useEffect(() => {
    const storedData = localStorage.getItem(
      LOCAL_STORAGE_KEYS.XMTP_FRAME_CONTEXT
    );
    if (storedData) {
      setFrameContext(JSON.parse(storedData));
    }
  }, []);

  useEffect(() => {
    if (frameContext) {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.XMTP_FRAME_CONTEXT,
        JSON.stringify(frameContext)
      );
    }
  }, [frameContext]);

  function resetFrameContext() {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.XMTP_FRAME_CONTEXT);
    setFrameContext(null);
  }

  return {
    frameContext: frameContext || fallbackContext,
    setFrameContext,
    resetFrameContext,
  };
}
