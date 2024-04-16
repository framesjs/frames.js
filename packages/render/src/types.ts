import type {
  Frame,
  FrameButton,
  SupportedParsingSpecification,
  TransactionTargetResponse,
  getFrame,
} from "frames.js";
import type { FarcasterFrameContext } from "./farcaster/frames";

export type OnTransactionFunc = (
  t: OnTransactionArgs
) => Promise<`0x${string}` | null>;

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
  /** the url of the homeframe, if null / undefined won't load a frame */
  homeframeUrl: string | null | undefined;
  /** the initial frame. if not specified will fetch it from the url prop */
  frame?: Frame;
  /** a function to handle mint buttons */
  onMint?: (t: OnMintArgs) => void;
  /** a function to handle transaction buttons, returns the transaction hash or null */
  onTransaction?: OnTransactionFunc;
  /** the context of this frame, used for generating Frame Action payloads */
  frameContext: FrameContext;
  /**
   * Extra data appended to the frame action payload
   */
  extraButtonRequestPayload?: Record<string, unknown>;
  /**
   * Which specification to use for parsing the frame action payload
   *
   * @defaultValue 'farcaster'
   */
  specification?: SupportedParsingSpecification;
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
    transactionId?: `0x${string}`;
    frameContext: FrameContext;
  }) => Promise<{
    body: B;
    searchParams: URLSearchParams;
  }>;
  /** isLoading frame */
  isLoading?: null | FrameStackPending;
  /** is loading the signer */
  isLoadingSigner?: boolean;
  /** A function called when a frame button is clicked without a signer */
  onSignerlessFramePress: () => void;
  logout?: () => void;
}

export type FrameRequest =
  | {
      method: "GET";
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

export type FrameStackBase = {
  timestamp: Date;
  /** speed in seconds */
  speed: number;
  responseStatus: number;
} & FrameRequest;

export type FrameStackPending = {
  timestamp: Date;
  status: "pending";
} & FrameRequest;

export type GetFrameResult = ReturnType<typeof getFrame>;

export type FrameStackDone = FrameStackBase & {
  frame: GetFrameResult;
  status: "done";
};

export type FrameStackRequestError = FrameStackBase & {
  status: "requestError";
  requestError: unknown;
};

export type FramesStackItem =
  | FrameStackPending
  | FrameStackDone
  | FrameStackRequestError;

export type FramesStack = FramesStackItem[];

export type FrameState = {
  fetchFrame: (request: FrameRequest) => void | Promise<void>;
  clearFrameStack: () => void;
  /** The frame at the top of the stack (at index 0) */
  frame: FramesStackItem | undefined;
  /** A stack of frames with additional context, with the most recent frame at index 0 */
  framesStack: FramesStack;
  inputText: string;
  setInputText: (s: string) => void;
  onButtonPress: (
    frame: Frame,
    frameButton: FrameButton,
    index: number
  ) => void | Promise<void>;
  homeframeUrl: string | null | undefined;
};

export type OnMintArgs = {
  target: string;
  frameButton: FrameButton;
  frame: Frame;
};

export type OnTransactionArgs = {
  transactionData: TransactionTargetResponse;
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

export type FrameActionBodyPayload = Record<string, unknown>;

export type FrameContext = FarcasterFrameContext;
