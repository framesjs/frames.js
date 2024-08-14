import type {
  XmtpOpenFramesRequest,
  XmtpValidationResponse,
} from "@xmtp/frames-validator";
import { validateFramesPost } from "@xmtp/frames-validator";
import type { MessageWithWalletAddressImplementation } from "../middleware/walletAddressMiddleware";
import type { OpenFramesActionData } from "../types";

export type XmtpFrameMessageReturnType =
  MessageWithWalletAddressImplementation &
    Omit<XmtpValidationResponse["actionBody"], "address" | "transactionId"> &
    OpenFramesActionData & {
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

  const address = (actionBody.address || "").startsWith("0x")
    ? (actionBody.address as `0x${string}`)
    : undefined;

  return {
    ...actionBody,
    address,
    connectedAddress: address,
    transactionId: (actionBody.transactionId || "").startsWith("0x")
      ? (actionBody.transactionId as `0x${string}`)
      : undefined,
    verifiedWalletAddress,
    walletAddress: () => Promise.resolve(verifiedWalletAddress),
  };
}
