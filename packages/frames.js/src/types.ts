export type {
  FrameActionDataParsedAndHubContext,
  GetFrameMessageOptions,
  FrameActionDataParsed,
  FrameMessageReturnType,
  FrameActionPayload,
  HubHttpUrlOptions,
} from "./validators/farcaster";

export type FrameVersion = "vNext" | `${number}-${number}-${number}`;

export type ClientProtocolId = `${string}@${FrameVersion}`;

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
  /** Open Frames specification for which client types are supported by the frame server */
  clientProtocols?: ClientProtocolId[];
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

export type AddressWithType = {
  address: `0x${string}`;
  type: "verified" | "custody";
};

export type UserDataReturnType = {
  displayName?: string;
  username?: string;
  bio?: string;
  profileImage?: string;
} | null;

/**
 * The body of valid `POST` requests triggered by Frame Buttons in other apps, when formatted as json, conforming to the Frames spec
 */
export type BaseFrameActionPayload<T = {}> = {
  /** once validated, should be the only trusted source for accessing frame data */
  trustedData: { messageBytes: string };
  /**
   * untrustedData can be faked by anyone by hitting your frame with a POST with an arbitrary payload. We recommend only using
   * trustedData to do actions.
   */
  untrustedData: {
    /** the url of the original frame, must be under 256 bytes */
    url: string;
    /** A Farcaster epoch timestamp (not UNIX timestamp) */
    timestamp: number;
    /** the button index, starting from 1 that the user pressed to invoke this POST */
    buttonIndex: ActionIndex;
    /** text input by the user into any input provided, "" if requested and no input, undefined if input not requested */
    inputText?: string;
  } & T;
  /** Open Frames: client protocol version */
  clientProtocol?: ClientProtocolId;
};

/** Data extracted and parsed from the frame message body */
export type BaseFrameActionDataParsed<T = {}> = {
  buttonIndex: number;
  inputText?: string;
  /** Returns whether the signature and messages contents valid. Can be undefined if the validation method needs to be checked asynchronously */
  isValid?: boolean;
} & T;

export type ProtocolValidator<
  T extends BaseFrameActionPayload = BaseFrameActionPayload,
  U = any,
  V extends BaseFrameActionDataParsed = BaseFrameActionDataParsed,
> = {
  validate: (frameActionPayload: T, options?: U) => Promise<V | null>;
  clientProtocolId: ClientProtocolId;
  canValidate: (frameActionPayload: T) => boolean;
};

export type ProtocolValidatorArray = Array<
  ProtocolValidator<BaseFrameActionPayload, any, BaseFrameActionDataParsed>
>;
