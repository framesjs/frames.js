import { bytesToHex } from "viem/utils";
import { type FrameActionMessage, Message } from "./farcaster";
import { normalizeCastId } from "./utils";
import type {
  FrameActionDataParsed,
  FrameActionDataParsedAndHubContext,
  FrameActionHubContext,
  FrameActionPayload,
  HubHttpUrlOptions,
} from "./types";
import { getAddressesForFid } from "./getAddressesForFid";
import { getUserDataForFid } from "./getUserDataForFid";
import { validateFrameMessage } from "./validateFrameMessage";
import { DEFAULT_HUB_API_KEY, DEFAULT_HUB_API_URL } from "./default";
import { InvalidFrameActionPayloadError } from "./core/errors";

function assertIsFarcasterMessage(
  message: Message
): asserts message is FrameActionMessage {
  if (!message.data) {
    throw new InvalidFrameActionPayloadError(
      "Could not decode the message, it is not a valid Farcaster message."
    );
  }
}

export type GetFrameMessageOptions = {
  fetchHubContext?: boolean;
} & HubHttpUrlOptions;

export type FrameMessageReturnType<T extends GetFrameMessageOptions> =
  T["fetchHubContext"] extends false
    ? FrameActionDataParsed
    : FrameActionDataParsedAndHubContext;

/** Returns a `FrameActionData` object from the message trusted data. (e.g. button index, input text). The `fetchHubContext` option (default: true) determines whether to validate and fetch other metadata from hubs.
 * If `isValid` is false, the message should not be trusted.
 */
export async function getFrameMessage<T extends GetFrameMessageOptions>(
  payload: FrameActionPayload,
  {
    fetchHubContext = true,
    hubHttpUrl = DEFAULT_HUB_API_URL,
    hubRequestOptions,
  }: T = {} as T
): Promise<FrameMessageReturnType<T>> {
  let requestOptions: HubHttpUrlOptions["hubRequestOptions"] =
    hubRequestOptions || {};

  if (hubHttpUrl === DEFAULT_HUB_API_URL) {
    // use public api key only if default hub url is used
    requestOptions = {
      headers: {
        api_key: DEFAULT_HUB_API_KEY,
      },
    };
  }

  const decodedMessage = Message.decode(
    Buffer.from(payload.trustedData.messageBytes, "hex")
  );

  assertIsFarcasterMessage(decodedMessage);

  const {
    buttonIndex,
    inputText: inputTextBytes,
    state: stateBytes,
    transactionId: transactionIdBytes,
  } = decodedMessage.data.frameActionBody;
  const inputText = Buffer.from(inputTextBytes).toString("utf-8");
  const transactionId =
    transactionIdBytes.length > 0 ? bytesToHex(transactionIdBytes) : undefined;
  const requesterFid = decodedMessage.data.fid;
  const castId = decodedMessage.data.frameActionBody.castId
    ? normalizeCastId(decodedMessage.data.frameActionBody.castId)
    : undefined;

  const connectedAddress =
    decodedMessage.data.frameActionBody.address.length > 0
      ? bytesToHex(decodedMessage.data.frameActionBody.address)
      : undefined;

  const state = Buffer.from(stateBytes).toString("utf-8");

  const parsedData: FrameActionDataParsed = {
    buttonIndex,
    castId,
    inputText,
    requesterFid,
    state,
    connectedAddress,
    transactionId,
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
        hubRequestOptions: requestOptions,
      }),
      fetch(
        `${hubHttpUrl}/v1/linkById?fid=${requesterFid}&target_fid=${castId?.fid}&link_type=follow`,
        requestOptions
      ).then((res) => res.ok || requesterFid === castId?.fid),
      fetch(
        `${hubHttpUrl}/v1/linkById?fid=${castId?.fid}&target_fid=${requesterFid}&link_type=follow`,
        requestOptions
      ).then((res) => res.ok || requesterFid === castId?.fid),
      fetch(
        `${hubHttpUrl}/v1/reactionById?fid=${requesterFid}&reaction_type=1&target_fid=${castId?.fid}&target_hash=${castId?.hash}`,
        requestOptions
      ).then((res) => res.ok),
      fetch(
        `${hubHttpUrl}/v1/reactionById?fid=${requesterFid}&reaction_type=2&target_fid=${castId?.fid}&target_hash=${castId?.hash}`,
        requestOptions
      ).then((res) => res.ok),
      getAddressesForFid({
        fid: requesterFid,
        options: {
          hubHttpUrl,
          hubRequestOptions: requestOptions,
        },
      }),
      getUserDataForFid({
        fid: requesterFid,
        options: {
          hubHttpUrl,
          hubRequestOptions: requestOptions,
        },
      }),
    ]);

    const requesterCustodyAddress = requesterEthAddresses.find(
      (item) => item.type === "custody"
    )?.address;

    if (!requesterCustodyAddress) {
      throw new Error("Custody address not found");
    }

    const requesterVerifiedAddresses = requesterEthAddresses
      .filter((item) => item.type === "verified")
      .map((item) => item.address);

    // Perform actions to fetch the HubFrameContext and then return the combined result
    const hubContext: FrameActionHubContext = {
      isValid: validationResult.isValid,
      casterFollowsRequester,
      requesterFollowsCaster,
      likedCast,
      recastedCast,
      requesterVerifiedAddresses,
      requesterCustodyAddress,
      requesterUserData,
    };
    return { ...parsedData, ...hubContext } as FrameMessageReturnType<T>;
  }

  return parsedData as FrameMessageReturnType<T>;
}
