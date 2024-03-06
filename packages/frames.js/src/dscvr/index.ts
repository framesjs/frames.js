import {
  type DscvrFramesRequest,
  type DscvrClientProtocol,
  type DscvrFrameActionData,
  validateClientProtocol,
  validateFramesPost,
} from "@dscvr-one/frames-adapter";
import { FrameActionPayload } from "..";

export type DscvrFrameMessageReturnType = DscvrFrameActionData & {
  verifiedDscvrId: string;
  verifiedContentId?: bigint;
};

export const isDscvrFrameActionPayload = (
  frameActionPayload: FrameActionPayload
): frameActionPayload is DscvrFramesRequest => {
  return (
    !!frameActionPayload.clientProtocol &&
    validateClientProtocol(frameActionPayload.clientProtocol)
  );
};

export const getDscvrFrameMessage = async (
  frameActionPayload: DscvrFramesRequest
): Promise<DscvrFrameMessageReturnType> => {
  const { actionBody, verifiedDscvrId, verifiedContentId } =
    await validateFramesPost({
      ...frameActionPayload,
      clientProtocol: frameActionPayload.clientProtocol as DscvrClientProtocol,
    });

  return {
    ...actionBody,
    verifiedDscvrId,
    verifiedContentId,
  };
};
