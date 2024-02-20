import { FrameActionMessage, Message } from "@farcaster/core";
import {
  FrameActionDataParsed,
  FrameActionHubContext,
  FrameActionDataParsedAndHubContext,
  FrameActionPayload,
  HubHttpUrlOptions,
  getAddressesForFid,
  getUserDataForFid,
  normalizeCastId,
  validateFrameMessage,
} from ".";

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
    hubHttpUrl = process.env.NODE_ENV === "development" ? "http://localhost:3000/debug/hub" : "https://hub-api.neynar.com",
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
