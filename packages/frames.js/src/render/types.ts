import { ErrorKeys, Frame, FrameButton } from "..";

export interface AuthStateInstance<
  T = object,
  B extends FrameActionBodyPayload = FrameActionBodyPayload,
> {
  user: T | null;
  isLoggedIn: boolean;
  signFrameAction: (actionContext: {
    target?: string;
    frameButton: FrameButton;
    buttonIndex: number;
    url: string;
    inputText?: string;
    frameContext: FrameContext;
  }) => Promise<{
    body: B;
    searchParams: URLSearchParams;
  }>;
  isLoading: boolean;
  promptLogin: () => void;
  logout: () => void;
}

export type FramesStack = Array<{
  timestamp: Date;
  method: "GET" | "POST";
  /** speed in seconds */
  speed: number;
  url: string;
  frame: Frame | null;
  frameValidationErrors: null | Record<ErrorKeys[number], string[]>;
  requestError: null | unknown;
}>;

export type FrameState = {
  /** The frame at the top of the stack (at index 0) */
  frame: Frame | null;
  /** A stack of frames with additional context, with the most recent frame at index 0 */
  framesStack: FramesStack;
  isLoading: boolean;
  inputText: string;
  setInputText: (s: string) => void;
  onButtonPress: (frameButton: FrameButton, index: number) => void;
  /** Whether the frame at the top of the stack has any frame validation errors. Undefined when the frame is not loaded or set */
  isFrameValid: boolean | undefined;
  frameValidationErrors: Record<ErrorKeys[number], string[]> | undefined | null;
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

export interface FarcasterFrameActionBodyPayload
  extends FrameActionBodyPayload {}

export type FrameContext = {
  castId: { hash: `0x${string}`; fid: number };
};
