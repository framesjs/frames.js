import { OpenFramesRequest } from "@open-frames/types";
import {
  ClientProtocol,
  FrameActionPayload,
  ProtocolIdentifier,
  ValidateFrameMessageOptions,
  hexStringToUint8Array,
} from ".";
import { FrameActionMessage, Message } from "@farcaster/core";

const defaultOptions = {
  hubHttpUrl = "https://hub-api.neynar.com",
  hubRequestOptions = {
    headers: {
      api_key: "NEYNAR_FRAMES_JS",
    },
  },
  supportedClientProtocols = ["farcaster@vNext"],
}

export type RequestValidator<
  RequestType extends OpenFramesRequest,
  ResponseType,
  ProtocolIdentifier extends string = string,
> = {
  protocolIdentifier: ProtocolIdentifier;

  minProtocolVersion: () => ClientProtocol;
  isSupported: (request: OpenFramesRequest) => request is RequestType;
  validate: (t:{
    payload: RequestType,
    options: ValidateFrameMessageOptions
  }) => Promise<{ isValid: boolean, message: ResponseType }
};

const validateFarcasterFrameMessage: RequestValidator<
  FrameActionPayload,
  FrameActionMessage,
  ProtocolIdentifier
> = {
  protocolIdentifier: "farcaster",
  minProtocolVersion: () => `farcaster@vNext`,
  isSupported: (request: OpenFramesRequest): request is FrameActionPayload => {
    return (
      !request.clientProtocol || request.clientProtocol === "farcaster@vNext"
    );
  },
  validate: ({
    options = defaultOptions,
    payload
  }: {
    payload: FrameActionPayload,
    options: ValidateFrameMessageOptions
  }) => {
    const { headers, ...rest } = options.hubRequestOptions;
    const validateMessageResponse = await fetch(
      `${options.hubHttpUrl}/v1/validateMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          ...headers,
        },
        body: hexStringToUint8Array(payload.trustedData.messageBytes),
        ...rest,
      }
    );

    const validateMessageJson = await validateMessageResponse.json();

    if (validateMessageJson.valid) {
      return {
        isValid: true,
        message: Message.fromJSON(
          validateMessageJson.message
        ) as FrameActionMessage,
      };
    } else {
      return {
        isValid: false,
        message: undefined,
      };
    }
  }
};

/**
 * @returns a Promise that resolves with whether the message signature is valid, by querying a Farcaster hub, as well as the message itself
 */
export async function validateFrameMessage<
  T extends FrameActionPayload = FrameActionPayload,
>(
  body: T,
  options: ValidateFrameMessageOptions = defaultOptions
): Promise<{
  isValid: boolean;
  message: FrameActionMessage | undefined;
}> {
  if (!body) {
    throw new Error(
      "Tried to call validateFrameMessage with no frame action payload. You may be calling it incorrectly on the homeframe"
    );
  }

  const clientProtocol =
    "clientProtocol" in body ? body.clientProtocol : "farcaster@vNext";
  const isClientProtocolSupported = defaultOptions.supportedClientProtocols.includes(
    clientProtocol as ClientProtocol
  );
  
}
