import type { MessageWithWalletAddressImplementation } from "../middleware/walletAddressMiddleware";
import type { OpenFramesActionData } from "../types";

export type AnonymousFrameMessage = OpenFramesActionData & {
  unixTimestamp: number;
};

export type AnonymousFrameMessageReturnType =
  MessageWithWalletAddressImplementation & AnonymousFrameMessage;

export type AnonymousOpenFramesRequest = {
  clientProtocol: `anonymous@${string}`;
  untrustedData: AnonymousFrameMessage;
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
    address: body.untrustedData.address,
    connectedAddress: body.untrustedData.address,
    transactionId: body.untrustedData.transactionId,
    walletAddress() {
      return Promise.resolve(body.untrustedData.address || undefined);
    },
  } as const;
}
