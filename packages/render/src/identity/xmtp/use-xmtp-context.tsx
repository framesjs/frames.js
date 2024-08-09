import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEYS } from "../constants";
import type { FrameContextManager, Storage } from "../types";
import { WebStorage } from "../storage";

export type XmtpFrameContext = {
  conversationTopic: string;
  participantAccountAddresses: `0x${string}`[];
  groupId?: Uint8Array;
  groupSecret?: Uint8Array;
};

type XmtpFrameContextOptions = {
  fallbackContext: XmtpFrameContext;
  /**
   * @defaultValue WebStorage
   */
  storage?: Storage;
};

export function useXmtpFrameContext({
  fallbackContext,
  storage,
}: XmtpFrameContextOptions): FrameContextManager<XmtpFrameContext> {
  // we use ref so we don't instantiate the storage if user passed their own storage
  const storageRef = useRef(storage ?? new WebStorage());
  const [frameContext, setFrameContext] = useState<XmtpFrameContext | null>(
    null
  );

  useEffect(() => {
    storageRef.current
      .getObject<XmtpFrameContext>(STORAGE_KEYS.XMTP_FRAME_CONTEXT)
      .then((storedData) => {
        if (storedData) {
          setFrameContext(storedData);
        }
      })
      .catch((e) => {
        // eslint-disable-next-line no-console -- provide feedback
        console.error(
          "@frames.js/render: Could not get the XMTP frame context",
          e
        );
      });
  }, []);

  const handleSetFrameContext: FrameContextManager<XmtpFrameContext>["setFrameContext"] =
    useCallback(async (newFrameContext) => {
      await storageRef.current.setObject<XmtpFrameContext>(
        STORAGE_KEYS.XMTP_FRAME_CONTEXT,
        newFrameContext
      );
      setFrameContext(newFrameContext);
    }, []);

  const resetFrameContext = useCallback(async () => {
    await storageRef.current.delete(STORAGE_KEYS.XMTP_FRAME_CONTEXT);
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
