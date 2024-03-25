import { FrameActionMessage, Message } from "./farcaster";
import { bytesToHex } from "viem";
import {
  FrameActionDataParsed,
  FrameActionDataParsedAndHubContext,
  FrameActionHubContext,
  FrameActionPayload,
  HubHttpUrlOptions,
  getAddressesForFid,
  getUserDataForFid,
  normalizeCastId,
  validateFrameMessage,
} from ".";
import { DEFAULT_HUB_API_KEY, DEFAULT_HUB_API_URL } from "./default";

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
    hubRequestOptions = {
      headers: {
        api_key: DEFAULT_HUB_API_KEY,
      },
    },
  }: T = {} as T
): Promise<FrameMessageReturnType<T>> {
  const decodedMessage = Message.decode(
    Buffer.from(payload.trustedData.messageBytes, "hex")
  ) as FrameActionMessage;

  const {
    buttonIndex,
    inputText: inputTextBytes,
    state: stateBytes,
    transactionId: transactionIdBytes,
  } = (decodedMessage.data
    .frameActionBody as typeof decodedMessage.data.frameActionBody) || {};
  const inputText = inputTextBytes
    ? Buffer.from(inputTextBytes).toString("utf-8")
    : undefined;
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

  const state = stateBytes
    ? Buffer.from(stateBytes).toString("utf-8")
    : undefined;

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
