import {
  validateFramesPost,
  XmtpOpenFramesRequest,
} from "@xmtp/frames-validator";
import { frames } from "@xmtp/proto";
import { FrameActionPayload } from "..";

export type XmtpFrameMessageReturnType = frames.FrameActionBody & {
  verifiedWalletAddress: string;
};

export function isXmtpFrameActionPayload(
  frameActionPayload: FrameActionPayload
): frameActionPayload is XmtpOpenFramesRequest {
  return (
    !!frameActionPayload.clientProtocol &&
    frameActionPayload.clientProtocol.startsWith("xmtp@")
  );
}

export async function getXmtpFrameMessage(
  frameActionPayload: FrameActionPayload
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
