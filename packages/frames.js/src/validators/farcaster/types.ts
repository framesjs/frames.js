import {
  ActionIndex,
  BaseFrameActionDataParsed,
  BaseFrameActionPayload,
  ProtocolValidator,
  UserDataReturnType,
} from "../..";

export type FarcasterValidatorType = ProtocolValidator<
  BaseFrameActionPayload<FrameActionUntrustedData>,
  GetFrameMessageOptions,
  FrameMessageReturnType<GetFrameMessageOptions>
>;

export type FrameActionDataParsedAndHubContext = FrameActionDataParsed &
  FrameActionHubContext;
/** Additional context for a frame message which requires communication with a Hub */

export type FrameActionHubContext = {
  isValid: boolean;
  /** Whether the user that initiated the action (requester) follows the author of the cast */
  requesterFollowsCaster: boolean;
  /** Whether the author of the cast follows the requester */
  casterFollowsRequester: boolean;
  /** Whether the requester has liked the cast that the frame is attached to (false if no cast) */
  likedCast: boolean;
  /** Whether the requester has recasted the cast that the frame is attached to (false if no cast) */
  recastedCast: boolean;
  /** Verified eth addresses of the requester */
  requesterVerifiedAddresses: string[];
  /** Custody address of the requester */
  requesterCustodyAddress: string;
  /** User data of the requester */
  requesterUserData: UserDataReturnType;
};
/** Data extracted and parsed from the frame message body */

export type FrameActionDataParsed = BaseFrameActionDataParsed<{
  requesterFid: number;
  castId?: {
    /** the fid of the Farcaster user (unique identifier) that shared the cast that included the frame */
    fid: number;
    /** the hash of the cast (unique identifier) that included the frame */
    hash: `0x${string}`;
  };
}>;

export type FrameActionUntrustedData = {
  /** the fid of the user who did the message. */
  fid: number;
  /** the hash of the `Farcaster` `AddFrameActionMessage` */
  messageHash: string;
  /** A Farcaster epoch timestamp (not UNIX timestamp) */
  timestamp: number;
  /** The Farcaster network is on network = 1 */
  network: number;
  /** the unique identifiers of the Farcaster cast, via the user who casted's `fid` and the cast `hash`, which is a unique identifier */
  castId: {
    /** the fid of the Farcaster user (unique identifier) that shared the cast that included the frame */
    fid: number;
    /** the hash of the cast (unique identifier) that included the frame */
    hash: string;
  };
};
/**
 * The body of valid `POST` requests triggered by Frame Buttons in other apps, when formatted as json, conforming to the Frames spec
 */

export type FrameActionPayload =
  BaseFrameActionPayload<FrameActionUntrustedData>;
/** Options available in functions that make use of Hub queries */

export type HubHttpUrlOptions = {
  /** Hub HTTP REST API endpoint to use (default: https://hub-api.neynar.com w/ public API key) */
  hubHttpUrl?: string;
  /** Hub HTTP request options (use this for setting API keys) */
  hubRequestOptions?: RequestInit;
};

export type GetFrameMessageOptions = {
  fetchHubContext?: boolean;
} & HubHttpUrlOptions;

export type FrameMessageReturnType<T extends GetFrameMessageOptions> =
  T["fetchHubContext"] extends false
    ? FrameActionDataParsed
    : FrameActionDataParsedAndHubContext;
