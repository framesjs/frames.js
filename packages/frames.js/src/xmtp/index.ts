import {
  validateFramesPost,
  XmtpOpenFramesRequest,
} from "@xmtp/frames-validator";
import { frames } from "@xmtp/proto";

export type XmtpFrameMessageReturnType = frames.FrameActionBody & {
  verifiedWalletAddress: string;
};

export function isXmtpFrameActionPayload(
  frameActionPayload: any
): frameActionPayload is XmtpOpenFramesRequest {
  return (
    !!frameActionPayload.clientProtocol &&
    frameActionPayload.clientProtocol.startsWith("xmtp@")
  );
}

export async function getXmtpFrameMessage(
  frameActionPayload: XmtpOpenFramesRequest
): Promise<XmtpFrameMessageReturnType> {
  const { actionBody, verifiedWalletAddress } = await validateFramesPost({
    ...frameActionPayload,
    clientProtocol: frameActionPayload.clientProtocol as `xmtp@${string}`,
  });

  return {
    ...actionBody,
    verifiedWalletAddress,
  };
}
