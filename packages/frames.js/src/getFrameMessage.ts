import { FrameActionMessage, Message } from "@farcaster/core";
import {
  FrameActionDataParsed,
  FrameActionHubContext,
  FrameActionPayload,
  HubHttpUrlOptions,
  getAddressForFid,
  normalizeCastId,
  validateFrameMessage,
} from ".";

export type GetFrameMessageOptions = {
  fetchHubContext?: boolean;
} & HubHttpUrlOptions;

export type FrameMessageReturnType<T extends GetFrameMessageOptions> =
  T["fetchHubContext"] extends true
    ? FrameActionDataParsed & FrameActionHubContext
    : FrameActionDataParsed;

export async function getFrameMessage<T extends GetFrameMessageOptions>(
  payload: FrameActionPayload,
  options?: T
): Promise<FrameMessageReturnType<T>> {
  const optionsOrDefaults = {
    fetchHubContext: options?.fetchHubContext ?? false,
    hubHttpUrl: options?.hubHttpUrl || "https://nemes.farcaster.xyz:2281",
  };

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

  if (optionsOrDefaults?.fetchHubContext) {
    const [
      validationResult,
      requesterFollowsCaster,
      casterFollowsRequester,
      likedCast,
      recastedCast,
      requesterVerifiedAddresses,
    ] = await Promise.all([
      validateFrameMessage(payload, {
        hubHttpUrl: optionsOrDefaults.hubHttpUrl,
      }),
      fetch(
        `${optionsOrDefaults.hubHttpUrl}/v1/linkById?fid=${requesterFid}&target_fid=${castId?.fid}&link_type=follow`
      ).then((res) => res.ok || requesterFid === castId?.fid),
      fetch(
        `${optionsOrDefaults.hubHttpUrl}/v1/linkById?fid=${castId?.fid}&target_fid=${requesterFid}&link_type=follow`
      ).then((res) => res.ok || requesterFid === castId?.fid),
      fetch(
        `${optionsOrDefaults.hubHttpUrl}/v1/reactionById?fid=${requesterFid}&reaction_type=1&target_fid=${castId?.fid}&target_hash=${castId?.hash}`
      ).then((res) => res.ok),
      fetch(
        `${optionsOrDefaults.hubHttpUrl}/v1/reactionById?fid=${requesterFid}&reaction_type=2&target_fid=${castId?.fid}&target_hash=${castId?.hash}`
      ).then((res) => res.ok),
      getAddressForFid({
        fid: requesterFid,
        options: {
          hubHttpUrl: optionsOrDefaults.hubHttpUrl,
        },
      }),
    ]);

    // Perform actions to fetch the HubFrameContext and then return the combined result
    const hubContext: FrameActionHubContext = {
      isValid: validationResult.isValid,
      casterFollowsRequester: casterFollowsRequester,
      requesterFollowsCaster: requesterFollowsCaster,
      likedCast,
      recastedCast,
      requesterVerifiedAddresses: requesterVerifiedAddresses
        ? [requesterVerifiedAddresses]
        : [],
    };
    return { ...parsedData, ...hubContext } as FrameMessageReturnType<T>;
  } else {
    return parsedData as FrameMessageReturnType<T>;
  }
}
