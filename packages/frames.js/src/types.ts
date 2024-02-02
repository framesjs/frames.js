export type Frame = {
  /** A valid frame version string. The string must be a release date (e.g. 2020-01-01 ) or vNext. Apps must ignore versions they do not understand. Currently, the only valid version is vNext.  */
  version: "vNext" | `${number}-${number}-${number}`;
  /** A page may contain 0 to 4 buttons. If more than 1 button is present, the idx values must be in sequence starting from 1 (e.g. 1, 2 3). If a broken sequence is present (e.g 1, 2, 4), apps must not render the frame and instead render an OG embed. */
  buttons?: FrameButtonsType;
  /** An image which must be smaller than 10MB and should have an aspect ratio of 1.91:1 */
  image: string;
  /** An image which must be smaller than 10MB and should have an aspect ratio of 1.91:1. Fallback for clients that do not support frames. */
  ogImage?: string;
  /** A 256-byte string which contains a valid URL to send the Signature Packet to. If this prop is not present, apps must POST to the frame URL. */
  postUrl?: string;
};

export type FrameButton = {
  /** A 256-byte string which is label of the button */
  label: string;
  /** Must be post or  post_redirect. Defaults to post if no value was specified.
   * If set to post, app must make the POST request and frame server must respond with a 200 OK, which may contain another frame.
   * If set to post_redirect, app must make the POST request, and the frame server must respond with a 302 OK with a location property set on the header. */
  action?: "post" | "post_redirect";
};

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
export type ValidateFrameMessageOptions = {
  ignoreSignature?: boolean;
};
