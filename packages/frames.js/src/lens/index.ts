import {
  FrameVerifySignatureResult,
  LensClient,
  development,
} from "@lens-protocol/client";

type LensFrameMessageType = {
  untrustedData: {
    specVersion: string;
    profileId: string;
    pubId: string;
    url: string;
    buttonIndex: number;
    unixTimestamp: number;
    deadline: number;
    inputText: string;
    state: string;
    actionResponse: string;
  };
  trustedData: {
    messageBytes: string;
    identityToken: string;
  };
};

export type LensFrameMessageReturnType = LensFrameMessageType & {
  isActionVerifed: boolean;
};

export function isLensFrameActionPayload(frameActionPayload: unknown) {
  return (
    typeof frameActionPayload === "object" &&
    frameActionPayload !== null &&
    "clientProtocol" in frameActionPayload &&
    typeof frameActionPayload.clientProtocol === "string" &&
    frameActionPayload.clientProtocol.startsWith("lens@")
  );
}

export async function getLensFrameMessage(
  frameActionPayload: LensFrameMessageType
): Promise<LensFrameMessageReturnType> {
  const lensClient = new LensClient({
    environment: development,
  });

  const typedData = await lensClient.frames.createFrameTypedData({
    ...frameActionPayload.untrustedData,
  });

  const response = await lensClient.frames.verifyFrameSignature({
    identityToken: frameActionPayload.trustedData.identityToken,
    signature: frameActionPayload.trustedData.messageBytes,
    signedTypedData: typedData,
  });

  return {
    ...frameActionPayload,
    isActionVerifed:
      response === FrameVerifySignatureResult.Verified ? true : false,
  };
}
