import type { Frame, FrameButton } from "..";
import { FarcasterFrameContext } from "./farcaster";

export type UseFrameReturn<
  T = object,
  B extends FrameActionBodyPayload = FrameActionBodyPayload,
> = {
  /** skip frame signing, for frames that don't verify signatures */
  dangerousSkipSigning?: boolean;
  /** the route used to POST frame actions. The post_url will be added as a the `url` query parameter */
  frameActionProxy: string;
  /** the route used to GET the initial frame via proxy */
  frameGetProxy: string;
  /** an signer state object used to determine what actions are possible */
  signerState: SignerStateInstance<T, B>;
  /** the url of the homeframe, if null won't load a frame */
  homeframeUrl: string | null;
  /** the initial frame. if not specified will fetch it from the url prop */
  frame?: Frame;
  /** a function to handle mint buttons */
  onMint?: (t: onMintArgs) => void;
  /** the context of this frame, used for generating Frame Action payloads */
  frameContext: FrameContext;
  /**
   * Extra data appended to the frame action payload
   */
  extraButtonRequestPayload?: Record<string, unknown>;
};

export interface SignerStateInstance<
  T = object,
  B extends FrameActionBodyPayload = FrameActionBodyPayload,
> {
  signer?: T | null;
  hasSigner: boolean;
  signFrameAction: (actionContext: {
    target?: string;
    frameButton: FrameButton;
    buttonIndex: number;
    url: string;
    inputText?: string;
    signer: T | null;
    state?: string;
    frameContext: FrameContext;
  }) => Promise<{
    body: B;
    searchParams: URLSearchParams;
  }>;
  isLoading?: null | FrameStackPending;
  /** A function called when a frame button is clicked without a signer */
  onSignerlessFramePress: () => void;
  logout?: () => void;
}

export type FrameRequest =
  | {
      method: "GET";
      request: {};
      url: string;
    }
  | {
      method: "POST";
      request: {
        body: object;
        searchParams: URLSearchParams;
      };
      url: string;
    };

export type FrameStackPending = {
  timestamp: Date;
} & FrameRequest;

export type FrameStackBase = FrameStackPending & {
  /** speed in seconds */
  speed: number;
  responseStatus: number;
};

export type FrameStackSuccess = FrameStackBase & {
  frame: Frame;
  frameValidationErrors: null | Record<string, string[]>;
  isValid: boolean;
};

export type FrameStackError = FrameStackBase & {
  requestError: unknown;
};

export type FramesStack = Array<FrameStackSuccess | FrameStackError>;

export type FrameState = {
  fetchFrame: (request: FrameRequest) => void;
  clearFrameStack: () => void;
  /** The frame at the top of the stack (at index 0) */
  frame: Frame | null;
  /** A stack of frames with additional context, with the most recent frame at index 0 */
  framesStack: FramesStack;
  isLoading: FrameStackPending | null;
  inputText: string;
  setInputText: (s: string) => void;
  onButtonPress: (frameButton: FrameButton, index: number) => void;
  /** Whether the frame at the top of the stack has any frame validation errors. Undefined when the frame is not loaded or set */
  isFrameValid: boolean | undefined;
  frameValidationErrors: Record<string, string[]> | undefined | null;
  error: null | unknown;
  homeframeUrl: string | null;
};

export type onMintArgs = {
  target: string;
  frameButton: FrameButton;
  frame: Frame;
};

export const themeParams = [
  "bg",
  "buttonColor",
  "buttonBg",
  "buttonBorderColor",
  "buttonRadius",
  "buttonHoverBg",
] as const;

export type FrameTheme = Partial<Record<(typeof themeParams)[number], string>>;

export interface FrameActionBodyPayload {}

export type FrameContext = FarcasterFrameContext;
