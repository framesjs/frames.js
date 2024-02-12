type FrameVersion = "vNext" | `${number}-${number}-${number}`;

export type ImageAspectRatio = "1.91:1" | "1:1";

/** A developer friendly representation of a Frame */
export type Frame = {
  /** A valid frame version string. The string must be a release date (e.g. 2020-01-01 ) or vNext. Apps must ignore versions they do not understand. Currently, the only valid version is vNext.  */
  version: FrameVersion;
  /** A 256-byte string which contains a valid URL to send the Signature Packet to. If this prop is not present, apps must POST to the frame URL. */
  postUrl: string;
  /** A page may contain 0 to 4 buttons. If more than 1 button is present, the idx values must be in sequence starting from 1 (e.g. 1, 2 3). If a broken sequence is present (e.g 1, 2, 4), apps must not render the frame and instead render an OG embed. */
  buttons?: FrameButtonsType;
  /** An image which should have an aspect ratio of 1.91:1 or 1:1 */
  image: string;
  /** Must be either `1.91:1` or `1:1`. Defaults to `1.91:1` */
  imageAspectRatio?: ImageAspectRatio;
  /** An image which should have an aspect ratio of 1.91:1. Fallback for clients that do not support frames. */
  ogImage?: string;
  /** Adding this property enables the text field. The content is a 32-byte label that is shown to the user (e.g. Enter a message). */
  inputText?: string;
};

/** as const so we can import and enumerate these */
export const frameErrorKeys = [
  "fc:frame",
  "fc:frame:image",
  "fc:frame:image:aspect_ratio",
  "fc:frame:post_url",
  "fc:frame:input:text",
  "fc:frame:button:1",
  "fc:frame:button:2",
  "fc:frame:button:3",
  "fc:frame:button:4",
  "og:image",
  "og:title",
] as const;

export type ErrorKeys = typeof frameErrorKeys;

export type ActionButtonType = "post" | "post_redirect" | "link";

/** A Frame represented as an object with keys and values corresponding to the Frames spec: https://docs.farcaster.xyz/reference/frames/spec */
export type FrameFlattened = {
  "fc:frame": FrameVersion;
  "fc:frame:image": string;
  "fc:frame:image:aspect_ratio"?: string;
  "fc:frame:post_url": string;
  "fc:frame:button:1"?: string;
  "fc:frame:button:1:action"?: ActionButtonType;
  "fc:frame:button:1:target"?: string;
  "fc:frame:button:2"?: string;
  "fc:frame:button:2:action"?: ActionButtonType;
  "fc:frame:button:2:target"?: string;
  "fc:frame:button:3"?: string;
  "fc:frame:button:3:action"?: ActionButtonType;
  "fc:frame:button:3:target"?: string;
  "fc:frame:button:4"?: string;
  "fc:frame:button:4:action"?: ActionButtonType;
  "fc:frame:button:4:target"?: string;
  "fc:frame:input:text"?: string;
};

export type FrameButtonLink = {
  action: "link";
  /** required for action type 'link' */
  target: string;
  /** A 256-byte string which is label of the button */
  label: string;
};

export type FrameButtonMint = {
  action: "mint";
  /** The target  property MUST be a valid [CAIP-10](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md) address, plus an optional token_id . */
  target: string;
  /** A 256-byte string which is label of the button */
  label: string;
};

export type FrameButtonPost = {
  /** Must be post or post_redirect. Defaults to post if no value was specified.
   * If set to post, app must make the POST request and frame server must respond with a 200 OK, which may contain another frame.
   * If set to post_redirect, app must make the POST request, and the frame server must respond with a 302 OK with a location property set on the header. */
  action: "post" | "post_redirect";
  /**
   * POST the packet to fc:frame:button:$idx:action:target if present
   * POST the packet to fc:frame:post_url if target was not present.
   */
  target?: string;
  /** A 256-byte string which is label of the button */
  label: string;
};
export type FrameButtonPostRedirect = FrameButtonPost;

export type FrameButton =
  | FrameButtonPost
  | FrameButtonLink
  | FrameButtonPostRedirect
  | FrameButtonMint;

/** The permitted types of `buttonIndex` in a Frame POST payload response */
export type ActionIndex = 1 | 2 | 3 | 4;

export type FrameButtonsType =
  | []
  | [FrameButton]
  | [FrameButton, FrameButton]
  | [FrameButton, FrameButton, FrameButton]
  | [FrameButton, FrameButton, FrameButton, FrameButton];

export type AddressReturnType<
  Options extends { fallbackToCustodyAddress?: boolean } | undefined,
> = Options extends { fallbackToCustodyAddress: true }
  ? `0x${string}`
  : `0x${string}` | null;

export type UserDataReturnType = {
  displayName?: string;
  username?: string;
  bio?: string;
  profileImage?: string;
} | null;

export type FrameActionDataParsedAndHubContext = FrameActionDataParsed &
  FrameActionHubContext;

/**
 * The body of valid `POST` requests triggered by Frame Buttons in other apps, when formatted as json, conforming to the Frames spec
 */
export type FrameActionPayload = {
  /** once validated, should be the only trusted source for accessing frame data */
  trustedData: { messageBytes: string };
  /**
   * untrustedData can be faked by anyone by hitting your frame with a POST with an arbitrary payload. We recommend only using
   * trustedData to do actions.
   */
  untrustedData: {
    /** the fid of the user who did the message. */
    fid: number;
    /** the url of the original frame, must be under 256 bytes */
    url: string;
    /** the hash of the `Farcaster` `AddFrameActionMessage` */
    messageHash: string;
    /** A Farcaster epoch timestamp (not UNIX timestamp) */
    timestamp: number;
    /** The Farcaster network is on network = 1 */
    network: number;
    /** the button index, starting from 1 that the user pressed to invoke this POST */
    buttonIndex: ActionIndex;
    /** the unique identifiers of the Farcaster cast, via the user who casted's `fid` and the cast `hash`, which is a unique identifier */
    castId: {
      /** the fid of the Farcaster user (unique identifier) that shared the cast that included the frame */
      fid: number;
      /** the hash of the cast (unique identifier) that included the frame */
      hash: string;
    };
    /** text input by the user into any input provided, "" if requested and no input, undefined if input not requested */
    inputText?: string;
  };
};

/** Options available in functions that make use of Hub queries */
export type HubHttpUrlOptions = {
  /** Hub HTTP REST API endpoint to use (default: https://api.neynar.com:2281 w/ public API key) */
  hubHttpUrl?: string;
  /** Hub HTTP request options (use this for setting API keys) */
  hubRequestOptions?: RequestInit;
};

/** Data extracted and parsed from the frame message body */
export type FrameActionDataParsed = {
  buttonIndex: number;
  requesterFid: number;
  castId?: {
    /** the fid of the Farcaster user (unique identifier) that shared the cast that included the frame */
    fid: number;
    /** the hash of the cast (unique identifier) that included the frame */
    hash: `0x${string}`;
  };
  inputText?: string;
};

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
  /** User data of the requester */
  requesterUserData: UserDataReturnType;
};
