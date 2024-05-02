import type {
  Frame,
  FrameButton,
  SupportedParsingSpecification,
  TransactionTargetResponse,
  getFrame,
} from "frames.js";
import type { Dispatch } from "react";
import type { ParseResult } from "frames.js/frame-parsers";
import type { FarcasterFrameContext } from "./farcaster/frames";

export type OnTransactionFunc = (
  t: OnTransactionArgs
) => Promise<`0x${string}` | null>;

export type UseFrameReturn<
  SignerStorageType = object,
  FrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  FrameContextType extends FrameContext = FarcasterFrameContext
> = {
  /** skip frame signing, for frames that don't verify signatures */
  dangerousSkipSigning?: boolean;
  /** the route used to POST frame actions. The post_url will be added as a the `url` query parameter */
  frameActionProxy: string;
  /** the route used to GET the initial frame via proxy */
  frameGetProxy: string;
  /** an signer state object used to determine what actions are possible */
  signerState: SignerStateInstance<
    SignerStorageType,
    FrameActionBodyType,
    FrameContextType
  >;
  /** the url of the homeframe, if null / undefined won't load a frame */
  homeframeUrl: string | null | undefined;
  /** the initial frame. if not specified will fetch it from the homeframeUrl prop */
  frame?: Frame | ParseResult;
  /** connected wallet address of the user */
  connectedAddress: `0x${string}` | undefined;
  /** a function to handle mint buttons */
  onMint?: (t: OnMintArgs) => void;
  /** a function to handle transaction buttons, returns the transaction hash or null */
  onTransaction?: OnTransactionFunc;
  /** the context of this frame, used for generating Frame Action payloads */
  frameContext: FrameContextType;
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
  SignerStorageType = object,
  FrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  FrameContextType extends FrameContext = FarcasterFrameContext
> {
  signer?: SignerStorageType | null;
  hasSigner: boolean;
  signFrameAction: (actionContext: {
    target?: string;
    frameButton: FrameButton;
    buttonIndex: number;
    url: string;
    inputText?: string;
    signer: SignerStorageType | null;
    state?: string;
    transactionId?: `0x${string}`;
    address?: `0x${string}`;
    /** Transacting address is not included in non-transaction frame actions */
    frameContext: FrameContextType | Omit<FrameContextType, "address">;
  }) => Promise<{
    body: FrameActionBodyType;
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

type FrameGETRequest = {
  method: "GET";
  url: string;
};

type FramePOSTRequest = {
  method: "POST";
  request: {
    body: object;
    searchParams: URLSearchParams;
  };
  url: string;
  /**
   * The frame that was the source of the button press
   */
  sourceFrame: Frame;
};

export type FrameRequest = FrameGETRequest | FramePOSTRequest;

export type FrameStackBase = {
  timestamp: Date;
  /** speed in seconds */
  speed: number;
  responseStatus: number;
};

export type FrameStackPending = {
  timestamp: Date;
  status: "pending";
} & FrameRequest;

export type GetFrameResult = ReturnType<typeof getFrame>;

export type FrameStackDone = FrameStackBase &
  FrameRequest & {
    frame: GetFrameResult;
    status: "done";
  };

export type FrameStackRequestError = FrameStackBase &
  FrameRequest & {
    status: "requestError";
    requestError: unknown;
  };

export type FrameStackMessage = FrameStackBase &
  FramePOSTRequest & {
    status: "message";
    message: string;
  };

export type FramesStackItem =
  | FrameStackPending
  | FrameStackDone
  | FrameStackRequestError
  | FrameStackMessage;

export type FramesStack = FramesStackItem[];

export type FrameReducerActions =
  | {
      action: "LOAD";
      item: FrameStackPending;
    }
  | {
      action: "REQUEST_ERROR";
      pendingItem: FrameStackPending;
      item: FrameStackRequestError;
    }
  | {
      action: "DONE";
      pendingItem: FrameStackPending;
      item: FramesStackItem;
    }
  | { action: "CLEAR" }
  | {
      action: "RESET_INITIAL_FRAME";
      resultOrFrame: ParseResult | Frame;
      homeframeUrl: string | null | undefined;
    };

export type FrameState = {
  fetchFrame: (
    request: FrameRequest,
    /**
     * If true, the frame stack will be cleared before the new frame is loaded
     *
     * @defaultValue false
     */
    shouldClear?: boolean
  ) => Promise<void>;
  clearFrameStack: () => void;
  dispatchFrameStack: Dispatch<FrameReducerActions>;
  /** The frame at the top of the stack (at index 0) */
  frame: FramesStackItem | undefined;
  /** A stack of frames with additional context, with the most recent frame at index 0 */
  framesStack: FramesStack;
  inputText: string;
  setInputText: (s: string) => void;
  onButtonPress: (
    frame: Frame,
    frameButton: FrameButton,
    index: number,
    fetchFrameOverride?: (request: FrameRequest) => Promise<void>
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

export type FrameContext = Record<string, unknown>;
