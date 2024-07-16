import type { MessageWithWalletAddressImplementation } from "../middleware/walletAddressMiddleware";

export type AnonymousFrameMessageReturnType =
  MessageWithWalletAddressImplementation & {
    buttonIndex: number;
    state?: string;
    inputText?: string;
    unixTimestamp: number;
  };

export type AnonymousOpenFramesRequest = {
  clientProtocol: string;
  untrustedData: AnonymousFrameMessageReturnType;
};

export function isAnonymousFrameActionPayload(
  body: unknown
): body is AnonymousOpenFramesRequest {
  return Boolean(
    body &&
      typeof body === "object" &&
      "untrustedData" in body &&
      typeof body.untrustedData === "object" &&
      body.untrustedData &&
      "buttonIndex" in body.untrustedData &&
      body.untrustedData.buttonIndex &&
      "clientProtocol" in body &&
      typeof body.clientProtocol === "string" &&
      body.clientProtocol.startsWith("anonymous@")
  );
}

// eslint-disable-next-line @typescript-eslint/require-await -- we need to return a promise
export async function getAnonymousFrameMessage(
  body: unknown
): Promise<AnonymousFrameMessageReturnType | undefined> {
  if (!isAnonymousFrameActionPayload(body)) {
    return undefined;
  }

  return {
    buttonIndex: body.untrustedData.buttonIndex,
    state: body.untrustedData.state,
    inputText: body.untrustedData.inputText,
    unixTimestamp: body.untrustedData.unixTimestamp,
    walletAddress() {
      return Promise.resolve(undefined);
    },
  } as const;
}
