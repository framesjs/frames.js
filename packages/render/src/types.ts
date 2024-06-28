import type {
  Frame,
  FrameButton,
  FrameButtonLink,
  FrameButtonPost,
  FrameButtonTx,
  SupportedParsingSpecification,
  TransactionTargetResponseSendTransaction,
  TransactionTargetResponseSignTypedDataV4,
  getFrame,
} from "frames.js";
import type { Dispatch } from "react";
import type { ParseResult } from "frames.js/frame-parsers";
import type { FarcasterFrameContext } from "./farcaster/frames";

export type OnTransactionArgs = {
  transactionData: TransactionTargetResponseSendTransaction;
  frameButton: FrameButton;
  frame: Frame;
};

export type OnTransactionFunc = (
  arg: OnTransactionArgs
) => Promise<`0x${string}` | null>;

export type OnSignatureArgs = {
  signatureData: TransactionTargetResponseSignTypedDataV4;
  frameButton: FrameButton;
  frame: Frame;
};

export type OnSignatureFunc = (
  args: OnSignatureArgs
) => Promise<`0x${string}` | null>;

export type UseFetchFrameOptions = {
  stackDispatch: React.Dispatch<FrameReducerActions>;
  specification: SupportedParsingSpecification;
  /**
   * URL or path to the frame proxy handling GET requests.
   */
  frameGetProxy: string;
  /**
   * URL or path to the frame proxy handling POST requests.
   */
  frameActionProxy: string;
  /**
   * Extra payload to be sent with the POST request.
   */
  extraButtonRequestPayload?: Record<string, unknown>;
  signFrameAction: (
    isDangerousSkipSigning: boolean,
    actionContext: SignerStateActionContext<any, any>
  ) => ReturnType<SignerStateInstance["signFrameAction"]>;
  onTransaction: OnTransactionFunc;
  onSignature: OnSignatureFunc;
  homeframeUrl: string | undefined | null;
  /**
   * This function can be used to customize how error is reported to the user.
   */
  onError?: (error: Error) => void;
  /**
   * Custom fetch compatible function used to make requests.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
   */
  fetchFn: typeof fetch;
  /**
   * This function is called when the frame returns a redirect in response to post_redirect button click.
   */
  onRedirect: (location: URL) => void;
};

export type UseFrameOptions<
  SignerStorageType = object,
  FrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  FrameContextType extends FrameContext = FarcasterFrameContext,
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
  /** a function to handle transaction buttons that returned transaction data from the target, returns the transaction hash or null */
  onTransaction?: OnTransactionFunc;
  /** A function to handle transaction buttons that returned signature data from the target, returns signature hash or null */
  onSignature?: OnSignatureFunc;
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
  /**
   * This function can be used to customize how error is reported to the user.
   */
  onError?: (error: Error) => void;
  /**
   * This function can be used to customize how the link button click is handled.
   */
  onLinkButtonClick?: (button: FrameButtonLink) => void;
} & Partial<Pick<UseFetchFrameOptions, "fetchFn" | "onRedirect">>;

export type SignerStateActionContext<
  SignerStorageType = object,
  FrameContextType extends FrameContext = FarcasterFrameContext,
> = {
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
};

export interface SignerStateInstance<
  SignerStorageType = object,
  FrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  FrameContextType extends FrameContext = FarcasterFrameContext,
> {
  signer?: SignerStorageType | null;
  hasSigner: boolean;
  signFrameAction: (
    actionContext: SignerStateActionContext<SignerStorageType, FrameContextType>
  ) => Promise<{
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

export type FrameGETRequest = {
  method: "GET";
  url: string;
};

export type FramePOSTRequest = {
  method: "POST";
  frameButton: FrameButtonPost | FrameButtonTx;
  signerStateActionContext: SignerStateActionContext<any, any>;
  isDangerousSkipSigning: boolean;
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
  responseBody: unknown;
  requestDetails: {
    body?: object;
    searchParams?: URLSearchParams;
  };
  url: string;
};

export type FrameStackPostPending = {
  method: "POST";
  timestamp: Date;
  status: "pending";
  request: FramePOSTRequest;
  requestDetails: {
    body?: object;
    searchParams?: URLSearchParams;
  };
  url: string;
};

export type FrameStackGetPending = {
  method: "GET";
  timestamp: Date;
  status: "pending";
  request: FrameGETRequest;
  requestDetails: {
    body?: object;
    searchParams?: URLSearchParams;
  };
  url: string;
};

export type FrameStackPending = FrameStackGetPending | FrameStackPostPending;

export type GetFrameResult = ReturnType<typeof getFrame>;

export type FrameStackDone = FrameStackBase & {
  request: FrameRequest;
  response: Response;
  frameResult: GetFrameResult;
  status: "done";
};

export type FrameStackDoneRedirect = FrameStackBase & {
  request: FramePOSTRequest;
  response: Response;
  location: string;
  status: "doneRedirect";
};

export type FrameStackRequestError = FrameStackBase & {
  request: FrameRequest;
  response: Response | null;
  status: "requestError";
  requestError: Error;
};

export type FrameStackMessage = FrameStackBase & {
  request: FramePOSTRequest;
  response: Response;
  status: "message";
  message: string;
  type: "info" | "error";
};

export type FramesStackItem =
  | FrameStackPending
  | FrameStackDone
  | FrameStackDoneRedirect
  | FrameStackRequestError
  | FrameStackMessage;

export type FramesStack = FramesStackItem[];

export type FrameReducerActions =
  | {
      action: "LOAD";
      item: FrameStackPending;
    }
  | {
      action: "ADD_REQUEST_DETAILS";
      pendingItem: FrameStackPending;
      requestDetails: {
        body?: object;
        searchParams?: URLSearchParams;
      };
      url: string;
    }
  | {
      action: "REQUEST_ERROR";
      pendingItem: FrameStackPending;
      item: FrameStackRequestError;
    }
  | {
      action: "DONE_REDIRECT";
      pendingItem: FrameStackPending;
      item: FrameStackDoneRedirect;
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
  currentFrameStackItem: FramesStackItem | undefined;
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
