import type { XmtpOpenFramesRequest } from "@xmtp/frames-validator";
import { validateFramesPost } from "@xmtp/frames-validator";
import type { frames } from "@xmtp/proto";

export type XmtpFrameMessageReturnType = frames.FrameActionBody & {
  verifiedWalletAddress: string;
};

export function isXmtpFrameActionPayload(
  frameActionPayload: unknown
): frameActionPayload is XmtpOpenFramesRequest {
  return (
    typeof frameActionPayload === "object" &&
    frameActionPayload !== null &&
    "clientProtocol" in frameActionPayload &&
    typeof frameActionPayload.clientProtocol === "string" &&
    frameActionPayload.clientProtocol.startsWith("xmtp@")
  );
}

export async function getXmtpFrameMessage(
  frameActionPayload: XmtpOpenFramesRequest
): Promise<XmtpFrameMessageReturnType> {
  const { actionBody, verifiedWalletAddress } =
    await validateFramesPost(frameActionPayload);

  return {
    ...actionBody,
    verifiedWalletAddress,
  };
}
