import {
  FrameVerifySignatureResult,
  LensClient,
  development,
  production,
} from "@lens-protocol/client";

type LensFrameMessageType = {
  clientProtocol: string;
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

export type LensFrameOptions = {
  environment?: "production" | "development";
};

export function isLensFrameActionPayload(
  frameActionPayload: LensFrameMessageType
): boolean {
  return (
    typeof frameActionPayload === "object" &&
    "clientProtocol" in frameActionPayload &&
    typeof frameActionPayload.clientProtocol === "string" &&
    frameActionPayload.clientProtocol.startsWith("lens@")
  );
}

export async function getLensFrameMessage(
  frameActionPayload: LensFrameMessageType,
  options?: LensFrameOptions
): Promise<LensFrameMessageReturnType> {
  const lensClientEnvironment =
    options?.environment === "development" ? development : production;

  const lensClient = new LensClient({
    environment: lensClientEnvironment,
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
    isActionVerifed: response === FrameVerifySignatureResult.Verified,
  };
}
