import {
  FrameVerifySignatureResult,
  LensClient,
  development,
  production,
} from "@lens-protocol/client";
import type { MessageWithWalletAddressImplementation } from "../middleware/walletAddressMiddleware";
import { InvalidFrameActionPayloadError } from "../core/errors";

export type LensFrameRequest = {
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

export type LensFrameResponse = MessageWithWalletAddressImplementation &
  LensFrameVerifiedFields & {
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

  const {
    url,
    inputText,
    state,
    buttonIndex,
    actionResponse,
    profileId,
    pubId,
    specVersion,
    deadline,
    identityToken,
  } = frameActionPayload.untrustedData;

  const typedData = await lensClient.frames
    .createFrameTypedData({
      url,
      inputText,
      state,
      buttonIndex,
      actionResponse,
      profileId,
      pubId,
      specVersion,
      deadline,
    })
    .catch((e) => {
      // eslint-disable-next-line no-console -- provide feedback to the developer
      console.error(e);
      throw new InvalidFrameActionPayloadError(
        "Could not create typed data for Lens, invalid payload."
      );
    });

  const response = await lensClient.frames.verifyFrameSignature({
    identityToken,
    signature: frameActionPayload.trustedData.messageBytes,
    signedTypedData: typedData,
  });

  return {
    ...typedData.value,
    isValid: response === FrameVerifySignatureResult.Verified,
    async walletAddress() {
      const profile = await lensClient.profile.fetch({
        forProfileId: typedData.value.profileId,
      });

      return profile?.ownedBy.address;
    },
  };
}
