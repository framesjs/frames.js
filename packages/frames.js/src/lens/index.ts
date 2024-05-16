import {
  FrameVerifySignatureResult,
  LensClient,
  development,
  production,
} from "@lens-protocol/client";

type LensFrameRequest = {
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
    identityToken: string;
  };
  trustedData: {
    messageBytes: string;
  };
};

type LensFrameVerifiedFields = {
  url: string;
  buttonIndex: number;
  profileId: string;
  pubId: string;
  inputText: string;
  state: string;
  actionResponse: string;
  deadline: number;
  specVersion: string;
};

export type LensFrameResponse = LensFrameVerifiedFields & {
  isValid: boolean;
};

export type LensFrameOptions = {
  environment?: "production" | "development";
};

export function isLensFrameActionPayload(
  frameActionPayload: unknown
): frameActionPayload is LensFrameRequest {
  return (
    typeof frameActionPayload === "object" &&
    frameActionPayload !== null &&
    "clientProtocol" in frameActionPayload &&
    typeof frameActionPayload.clientProtocol === "string" &&
    frameActionPayload.clientProtocol.startsWith("lens@")
  );
}

export async function getLensFrameMessage(
  frameActionPayload: LensFrameRequest,
  options?: LensFrameOptions
): Promise<LensFrameResponse> {
  const lensClientEnvironment =
    options?.environment === "development" ? development : production;

  const lensClient = new LensClient({
    environment: lensClientEnvironment,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- de-structure fields due to strict GraphQL checking of createFrameTypedData
  const { identityToken, unixTimestamp, ...untrustedData } =
    frameActionPayload.untrustedData;
  const typedData = await lensClient.frames.createFrameTypedData(untrustedData);

  const response = await lensClient.frames.verifyFrameSignature({
    identityToken,
    signature: frameActionPayload.trustedData.messageBytes,
    signedTypedData: typedData,
  });

  return {
    ...typedData.value,
    isValid: response === FrameVerifySignatureResult.Verified,
  };
}
