import {
  PublicClient,
  testnet,
  FrameVerifySignatureResult
} from "@lens-protocol/client";
import {
  verifyFrameSignature, createFrameTypedData
} from "@lens-protocol/client/actions";
import type { MessageWithWalletAddressImplementation } from "../middleware/walletAddressMiddleware";
import { InvalidFrameActionPayloadError } from "../core/errors";
import type { OpenFramesActionData } from "../types";

export type LensFrameRequest = {
  clientProtocol: string;
  untrustedData: {
    specVersion: string;
    account: string;
    post: string;
    app: string;
    url: string;
    buttonIndex: number;
    unixTimestamp: number;
    deadline: number;
    inputText: string;
    state: string;
    transactionId: string;
    identityToken: string;
  };
  trustedData: {
    messageBytes: string;
  };
};

type LensFrameVerifiedFields = {
  url: string;
  buttonIndex: number;
  account: string;
  post: string;
  app: string;
  inputText: string;
  state: string;
  transactionId: string;
  deadline: number;
  specVersion: string;
};

export type LensFrameResponse = MessageWithWalletAddressImplementation &
  LensFrameVerifiedFields &
  OpenFramesActionData & {
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
  //const lensClientEnvironment =
  //  options?.environment === "development" ? development : production;

  const lensClient = PublicClient.create({
    environment: testnet,
  });

  const {
    url,
    inputText,
    state,
    buttonIndex,
    transactionId,
    account,
    post,
    app,
    specVersion,
    deadline,
    identityToken,
  } = frameActionPayload.untrustedData;

  const typedData = await createFrameTypedData(lensClient, {
    url,
    inputText,
    state,
    buttonIndex,
    transactionId,
    account,
    post,
    app,
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

  const response = await verifyFrameSignature(lensClient, {
    identityToken,
    signature: frameActionPayload.trustedData.messageBytes,
    signedTypedData: typedData,
  });

  return {
    ...typedData.value,
    isValid: response === FrameVerifySignatureResult.Verified,
    walletAddress() {
      return Promise.resolve(typedData.value.account);
    },
  };
}
