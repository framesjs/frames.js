import { FrameActionMessage, Message } from "@farcaster/core";
import {
  BaseFrameActionDataParsed,
  BaseFrameActionPayload,
  getAddressesForFid,
  getUserDataForFid,
  hexStringToUint8Array,
  normalizeCastId,
} from "../..";
import {
  FarcasterValidatorType,
  GetFrameMessageOptions,
  FrameActionDataParsed,
  FrameActionDataParsedAndHubContext,
  FrameActionPayload,
  FrameMessageReturnType,
  FrameActionHubContext,
  HubHttpUrlOptions,
} from "./types";

export * from "./types";

export const farcasterValidator: FarcasterValidatorType = {
  async validate(frameActionBody, options) {
    if (!this.canValidate(frameActionBody)) {
      return null;
    }

    const frameMessage = await getFrameMessage(frameActionBody, options);
    return frameMessage;
  },
  clientProtocolId: "farcaster@vNext",
  canValidate(frameActionPayload) {
    return (
      !frameActionPayload.clientProtocol ||
      frameActionPayload.clientProtocol.startsWith("farcaster@")
    );
  },
} as const;

/** Creates a ProtocolValidator of `FarcasterValidatorType` with custom options */
export function createFarcasterValidator(
  options?: GetFrameMessageOptions
): FarcasterValidatorType {
  return {
    ...farcasterValidator,
    async validate(frameActionBody) {
      if (!this.canValidate(frameActionBody)) {
        return null;
      }
      const frameMessage = await getFrameMessage(frameActionBody, options);
      return frameMessage;
    },
  };
}

export function isFarcasterFrameAction(
  actionDataParsed: BaseFrameActionDataParsed
): actionDataParsed is FrameActionDataParsed {
  // Assuming there's a specific property or characteristic that can be checked
  // For demonstration, let's say FarcasterFrameActionDataParsed has a unique property `farcasterProperty`
  return (actionDataParsed as FrameActionDataParsed).hasOwnProperty(
    "requesterFid"
  );
}

export function isFarcasterFrameActionWithHubContext(
  actionDataParsed: BaseFrameActionDataParsed
): actionDataParsed is FrameActionDataParsedAndHubContext {
  // Assuming there's a specific property or characteristic that can be checked
  // For demonstration, let's say FarcasterFrameActionDataParsed has a unique property `farcasterProperty`
  return (actionDataParsed as FrameActionDataParsed).hasOwnProperty(
    "requesterFollowsCaster"
  );
}

export function isFarcasterFrameActionPayload(
  frameActionPayload: BaseFrameActionPayload
): frameActionPayload is FrameActionPayload {
  return frameActionPayload.untrustedData.hasOwnProperty("fid");
}

/** Returns a `FrameActionData` object from the message trusted data. (e.g. button index, input text). The `fetchHubContext` option (default: true) determines whether to validate and fetch other metadata from hubs.
 * If `isValid` is false, the message should not be trusted.
 */
export async function getFrameMessage<T extends GetFrameMessageOptions>(
  payload: FrameActionPayload,
  {
    fetchHubContext = true,
    hubHttpUrl = "https://hub-api.neynar.com",
    hubRequestOptions = {
      headers: {
        api_key: "NEYNAR_FRAMES_JS",
      },
    },
  }: T = {} as T
): Promise<FrameMessageReturnType<T>> {
  const decodedMessage = Message.decode(
    Buffer.from(payload.trustedData.messageBytes, "hex")
  ) as FrameActionMessage;

  const { buttonIndex, inputText: inputTextBytes } =
    decodedMessage.data.frameActionBody || {};
  const inputText = inputTextBytes
    ? Buffer.from(inputTextBytes).toString("utf-8")
    : undefined;

  const requesterFid = decodedMessage.data.fid;
  const castId = decodedMessage.data.frameActionBody.castId
    ? normalizeCastId(decodedMessage.data.frameActionBody.castId)
    : undefined;

  const parsedData: FrameActionDataParsed = {
    buttonIndex,
    castId,
    inputText,
    requesterFid,
  };

  if (fetchHubContext) {
    const [
      validationResult,
      requesterFollowsCaster,
      casterFollowsRequester,
      likedCast,
      recastedCast,
      requesterEthAddresses,
      requesterUserData,
    ] = await Promise.all([
      validateFrameMessage(payload, {
        hubHttpUrl,
        hubRequestOptions,
      }),
      fetch(
        `${hubHttpUrl}/v1/linkById?fid=${requesterFid}&target_fid=${castId?.fid}&link_type=follow`,
        hubRequestOptions
      ).then((res) => res.ok || requesterFid === castId?.fid),
      fetch(
        `${hubHttpUrl}/v1/linkById?fid=${castId?.fid}&target_fid=${requesterFid}&link_type=follow`,
        hubRequestOptions
      ).then((res) => res.ok || requesterFid === castId?.fid),
      fetch(
        `${hubHttpUrl}/v1/reactionById?fid=${requesterFid}&reaction_type=1&target_fid=${castId?.fid}&target_hash=${castId?.hash}`,
        hubRequestOptions
      ).then((res) => res.ok),
      fetch(
        `${hubHttpUrl}/v1/reactionById?fid=${requesterFid}&reaction_type=2&target_fid=${castId?.fid}&target_hash=${castId?.hash}`,
        hubRequestOptions
      ).then((res) => res.ok),
      getAddressesForFid({
        fid: requesterFid,
        options: {
          hubHttpUrl,
          hubRequestOptions,
        },
      }),
      getUserDataForFid({
        fid: requesterFid,
        options: {
          hubHttpUrl,
          hubRequestOptions,
        },
      }),
    ]);

    const requesterCustodyAddress = requesterEthAddresses.find(
      (item) => item.type === "custody"
    )!.address;
    const requesterVerifiedAddresses = requesterEthAddresses
      .filter((item) => item.type === "verified")
      .map((item) => item.address);

    // Perform actions to fetch the HubFrameContext and then return the combined result
    const hubContext: FrameActionHubContext = {
      isValid: validationResult.isValid,
      casterFollowsRequester: casterFollowsRequester,
      requesterFollowsCaster: requesterFollowsCaster,
      likedCast,
      recastedCast,
      requesterVerifiedAddresses,
      requesterCustodyAddress,
      requesterUserData,
    };
    return { ...parsedData, ...hubContext } as FrameMessageReturnType<T>;
  } else {
    return parsedData as FrameMessageReturnType<T>;
  }
}

/**
 * @returns a Promise that resolves with whether the message signature is valid, by querying a Farcaster hub, as well as the message itself
 */
export async function validateFrameMessage(
  body: FrameActionPayload,
  {
    hubHttpUrl = "https://hub-api.neynar.com",
    hubRequestOptions = {
      headers: {
        api_key: "NEYNAR_FRAMES_JS",
      },
    },
  }: HubHttpUrlOptions = {}
): Promise<{
  isValid: boolean;
  message: FrameActionMessage | undefined;
}> {
  if (!body) {
    throw new Error(
      "Tried to call validateFrameMessage with no frame action payload. You may be calling it incorrectly on the homeframe"
    );
  }

  const { headers, ...rest } = hubRequestOptions;
  const validateMessageResponse = await fetch(
    `${hubHttpUrl}/v1/validateMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        ...headers,
      },
      body: hexStringToUint8Array(body.trustedData.messageBytes),
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
