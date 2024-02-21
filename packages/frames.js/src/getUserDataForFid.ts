import { DEFAULT_HUB_API_KEY, DEFAULT_HUB_API_URL } from "./default";
import { MessageType, UserDataType, Message } from "./farcaster";
import { HubHttpUrlOptions, UserDataReturnType } from "./types";

/**
 * Returns the latest user data for a given Farcaster users Fid if available.
 */
export async function getUserDataForFid<
  Options extends HubHttpUrlOptions | undefined,
>({
  fid,
  options = {},
}: {
  fid: number;
  options?: Options;
}): Promise<UserDataReturnType> {
  const {
    hubHttpUrl = DEFAULT_HUB_API_URL,
    hubRequestOptions = {
      headers: {
        api_key: DEFAULT_HUB_API_KEY,
      },
    },
  } = options;

  const userDataResponse = await fetch(
    `${hubHttpUrl}/v1/userDataByFid?fid=${fid}`,
    hubRequestOptions
  );

  const { messages } = (await userDataResponse
    .clone()
    .json()
    .catch(async () => {
      // body has not been
      throw new Error(
        `Failed to parse response body as JSON because server hub returned response with status "${userDataResponse.status}" and body "${await userDataResponse.clone().text()}"`
      );
    })) as { messages?: Message[] };

  if (messages && messages.length > 0) {
    const valuesByType = messages.reduce(
      (acc, messageJson: Message) => {
        const message = Message.fromJSON(messageJson);

        if (message.data?.type !== MessageType.USER_DATA_ADD) {
          return acc;
        }

        const timestamp = message.data.timestamp;
        const { type, value } = message.data.userDataBody!;

        if (!acc[type]) {
          acc[type] = { value, timestamp };
        } else if (message.data.timestamp > acc[type]!.timestamp) {
          acc[type] = { value, timestamp };
        }
        return acc;
      },
      {} as Record<
        UserDataType,
        undefined | { value: string; timestamp: number }
      >
    );

    return {
      profileImage: valuesByType[UserDataType.PFP]?.value,
      displayName: valuesByType[UserDataType.DISPLAY]?.value,
      username: valuesByType[UserDataType.USERNAME]?.value,
      bio: valuesByType[UserDataType.BIO]?.value,
    };
  } else {
    return null;
  }
}
