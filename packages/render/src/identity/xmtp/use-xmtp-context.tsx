import { createFrameContextHook } from "../create-frame-context-hook";

export type XmtpFrameContext = {
  conversationTopic: string;
  participantAccountAddresses: `0x${string}`[];
  groupId?: Uint8Array;
  groupSecret?: Uint8Array;
};

export const useXmtpFrameContext = createFrameContextHook<XmtpFrameContext>({
  storageKey: "xmtpFrameContext",
});
