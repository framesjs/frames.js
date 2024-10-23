import type {
  Frame,
  FrameButton,
  FrameButtonLink,
  FrameButtonPost,
  FrameButtonTx,
  SupportedParsingSpecification,
  TransactionTargetResponse,
  TransactionTargetResponseSendTransaction,
  TransactionTargetResponseSignTypedDataV4,
} from "frames.js";
import type { Dispatch } from "react";
import type {
  ParseFramesWithReportsResult,
  ParseResult,
} from "frames.js/frame-parsers";
import type {
  CastActionResponse,
  ComposerActionFormResponse,
  ComposerActionState,
} from "frames.js/types";
import type { FrameStackAPI } from "./use-frame-stack";

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

type OnComposerFormActionFuncArgs = {
  form: ComposerActionFormResponse;
  cast: ComposerActionState;
};

export type OnComposeFormActionFuncReturnType =
  | {
      /**
       * Updated composer action state
       */
      composerActionState: ComposerActionState;
    }
  | undefined;

/**
 * If the function resolves to undefined it means that the dialog was probably closed resulting in no operation at all.
 */
export type OnComposerFormActionFunc = (
  arg: OnComposerFormActionFuncArgs
) => Promise<OnComposeFormActionFuncReturnType>;

/**
 * Called when user presses transaction button but there is no wallet connected.
 *
 * After wallet is connect, "connectAddress" option on useFrame() should be set to the connected address.
 */
export type OnConnectWalletFunc = () => void;

/**
 * Used to sign frame action
 */
export type SignFrameActionFunc<
  TSignerStorageType extends AllowedStorageTypes = Record<string, unknown>,
  TFrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  TFrameContextType extends FrameContext = FrameContext,
> = (
  actionContext: SignerStateActionContext<TSignerStorageType, TFrameContextType>
) => Promise<SignedFrameAction<TFrameActionBodyType>>;

export type UseFetchFrameOptions = {
  dangerousSkipSigning: boolean;
  stackAPI: FrameStackAPI;
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
  /**
   * Called after transaction data has been returned from the server and user needs to approve the transaction.
   */
  onTransaction: OnTransactionFunc;
  /** Transaction data suffix */
  transactionDataSuffix?: `0x${string}`;
  onSignature: OnSignatureFunc;
  onComposerFormAction: OnComposerFormActionFunc;
  /**
   * This function can be used to customize how error is reported to the user.
   *
   * Should be memoized
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
  /**
   * Called when user presses the tx button just before the action is signed and sent to the server
   * to obtain the transaction data.
   */
  onTransactionDataStart?: (event: { button: FrameButtonTx }) => void;
  /**
   * Called when transaction data has been successfully returned from the server.
   */
  onTransactionDataSuccess?: (event: {
    button: FrameButtonTx;
    data: TransactionTargetResponse;
  }) => void;
  /**
   * Called when anything failed between onTransactionDataStart and obtaining the transaction data.
   */
  onTransactionDataError?: (error: Error) => void;
  /**
   * Called before onTransaction() is called
   * Called after onTransactionDataSuccess() is called
   */
  onTransactionStart?: (event: {
    button: FrameButtonTx;
    data: TransactionTargetResponseSendTransaction;
  }) => void;
  /**
   * Called when onTransaction() returns a transaction id
   */
  onTransactionSuccess?: (event: { button: FrameButtonTx }) => void;
  /**
   * Called when onTransaction() fails to return a transaction id
   */
  onTransactionError?: (error: Error) => void;
  /**
   * Called before onSignature() is called
   * Called after onTransactionDataSuccess() is called
   */
  onSignatureStart?: (event: {
    button: FrameButtonTx;
    data: TransactionTargetResponseSignTypedDataV4;
  }) => void;
  /**
   * Called when onSignature() returns a transaction id
   */
  onSignatureSuccess?: (event: { button: FrameButtonTx }) => void;
  /**
   * Called when onSignature() fails to return a transaction id
   */
  onSignatureError?: (error: Error) => void;
  /**
   * Called after either onSignatureSuccess() or onTransactionSuccess() is called just before the transaction is sent to the server.
   */
  onTransactionProcessingStart?: (event: {
    button: FrameButtonTx;
    transactionId: `0x${string}`;
  }) => void;
  /**
   * Called after the transaction has been successfully sent to the server and returned a success response.
   */
  onTransactionProcessingSuccess?: (event: {
    button: FrameButtonTx;
    transactionId: `0x${string}`;
  }) => void;
  /**
   * Called when the transaction has been sent to the server but the server returned an error.
   */
  onTransactionProcessingError?: (error: Error) => void;
};

export type ResolveFrameActionContextArgumentAction =
  | { type: "composer" }
  | { type: "cast" }
  | {
      type: "frame";
      /**
       * Current parse result that is active
       */
      parseResult: ParseFramesWithReportsResult;
      /**
       * Specification that is currently active
       */
      specification: SupportedParsingSpecification;
    };

export type ResolveFrameActionContextArgument = {
  readonly frameStack: FramesStack;
  readonly specifications: SupportedParsingSpecification[];
  readonly action: ResolveFrameActionContextArgumentAction;
};

export type ResolveFrameActionContextResult = {
  signerState: SignerStateInstance<any, any, any>;
  frameContext: FrameContext;
};

export type ResolveFrameActionContextFunction = (
  arg: ResolveFrameActionContextArgument
) => Promise<ResolveFrameActionContextResult>;

export type AllowedStorageTypes = Record<string, unknown> | null;

export type UseFrameOptions<
  TSignerStorageType extends AllowedStorageTypes = Record<string, unknown>,
  TFrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  TFrameContextType extends FrameContext = FrameContext,
> = {
  /**
   * skip frame signing, for frames that don't verify signatures
   *
   * @defaultValue false
   */
  dangerousSkipSigning?: boolean;
  /** the route used to POST frame actions. The post_url will be added as a the `url` query parameter */
  frameActionProxy: string;
  /** the route used to GET the initial frame via proxy */
  frameGetProxy: string;
  /**
   * The url of the homeframe,
   *
   * if null / undefined won't load a frame nor show the initial frame.
   *
   * This value should be memoized otherwise it will reset frame state.
   */
  homeframeUrl: string | null | undefined;
  /**
   * The initial frame. if not specified will fetch it from the homeframeUrl prop.
   *
   * This value should be immutable otherwise it will reset frame state.
   */
  frame?: Frame | ParseResult | ParseFramesWithReportsResult;
  /**
   * Which specification to use for parsing the frame action payload. Can be provided as a tuple to define the preferred and fallback specification.
   *
   * @defaultValue 'farcaster'
   */
  specification?:
    | SupportedParsingSpecification
    | [SupportedParsingSpecification, SupportedParsingSpecification];
  /**
   * A signer state object used to determine what actions are possible.
   *
   * This is a default signer that will be used unless you provide resolveActionContext function.
   */
  signerState: SignerStateInstance<
    TSignerStorageType,
    TFrameActionBodyType,
    TFrameContextType
  >;
  /**
   * the context of this frame, used for generating Frame Action payloads
   */
  frameContext: TFrameContextType;
  /**
   * The function called on each button press to resolve which signer and context to use
   * based on current state and parsed frames.
   *
   * If no function is provided it will use signerState and frameContext props.
   */
  resolveActionContext?: ResolveFrameActionContextFunction;
  /**
   * connected wallet address of the user, send to the frame for transaction requests
   */
  connectedAddress: `0x${string}` | undefined;
  /** a function to handle mint buttons */
  onMint?: (t: OnMintArgs) => void;
  /** a function to handle transaction buttons that returned transaction data from the target, returns the transaction hash or null */
  onTransaction?: OnTransactionFunc;
  /** Transaction data suffix */
  transactionDataSuffix?: `0x${string}`;
  /** A function to handle transaction buttons that returned signature data from the target, returns signature hash or null */
  onSignature?: OnSignatureFunc;
  /**
   * Called when user presses transaction button but there is no wallet connected.
   */
  onConnectWallet?: OnConnectWalletFunc;
  /**
   * Extra data appended to the frame action payload
   */
  extraButtonRequestPayload?: Record<string, unknown>;
  /**
   * This function can be used to customize how error is reported to the user.
   */
  onError?: (error: Error) => void;
  /**
   * This function can be used to customize how the link button click is handled.
   */
  onLinkButtonClick?: (button: FrameButtonLink) => void;
} & Partial<
  Pick<
    UseFetchFrameOptions,
    | "fetchFn"
    | "onRedirect"
    | "onComposerFormAction"
    | "onTransactionDataError"
    | "onTransactionDataStart"
    | "onTransactionDataSuccess"
    | "onTransactionError"
    | "onTransactionStart"
    | "onTransactionSuccess"
    | "onTransactionProcessingError"
    | "onTransactionProcessingStart"
    | "onTransactionProcessingSuccess"
  >
>;

type SignerStateActionSharedContext<
  TSignerStorageType extends AllowedStorageTypes = Record<string, unknown>,
  TFrameContextType extends FrameContext = FrameContext,
> = {
  target?: string;
  frameButton: FrameButton;
  buttonIndex: number;
  url: string;
  inputText?: string;
  signer: TSignerStorageType | null;
  state?: string;
  transactionId?: `0x${string}`;
  address?: `0x${string}`;
  /** Transacting address is not included in non-transaction frame actions */
  frameContext: TFrameContextType;
};

export type SignerStateDefaultActionContext<
  TSignerStorageType extends AllowedStorageTypes = Record<string, unknown>,
  TFrameContextType extends FrameContext = FrameContext,
> = {
  type?: "default";
} & SignerStateActionSharedContext<TSignerStorageType, TFrameContextType>;

export type SignerStateTransactionDataActionContext<
  TSignerStorageType extends AllowedStorageTypes = Record<string, unknown>,
  TFrameContextType extends FrameContext = FrameContext,
> = {
  type: "tx-data";
  /** Wallet address used to create the transaction, available only for "tx" button actions */
  address: `0x${string}`;
} & SignerStateActionSharedContext<TSignerStorageType, TFrameContextType>;

export type SignerStateTransactionPostActionContext<
  TSignerStorageType extends AllowedStorageTypes = Record<string, unknown>,
  TFrameContextType extends FrameContext = FrameContext,
> = {
  type: "tx-post";
  /** Wallet address used to create the transaction, available only for "tx" button actions */
  address: `0x${string}`;
  transactionId: `0x${string}`;
} & SignerStateActionSharedContext<TSignerStorageType, TFrameContextType>;

export type SignerStateActionContext<
  TSignerStorageType extends AllowedStorageTypes = Record<string, unknown>,
  TFrameContextType extends FrameContext = FrameContext,
> =
  | SignerStateDefaultActionContext<TSignerStorageType, TFrameContextType>
  | SignerStateTransactionDataActionContext<
      TSignerStorageType,
      TFrameContextType
    >
  | SignerStateTransactionPostActionContext<
      TSignerStorageType,
      TFrameContextType
    >;

export type SignedFrameAction<
  TFrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
> = {
  body: TFrameActionBodyType;
  searchParams: URLSearchParams;
};

export type SignFrameActionFunction<
  TSignerStateActionContext extends
    SignerStateActionContext = SignerStateActionContext,
  TFrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
> = (
  actionContext: TSignerStateActionContext
) => Promise<SignedFrameAction<TFrameActionBodyType>>;

export interface SignerStateInstance<
  TSignerStorageType extends AllowedStorageTypes = Record<string, unknown>,
  TFrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  TFrameContextType extends FrameContext = FrameContext,
> {
  signer: TSignerStorageType | null;
  /**
   * True only if signer is approved or impersonating
   */
  hasSigner: boolean;
  signFrameAction: SignFrameActionFunction<
    SignerStateActionContext<TSignerStorageType, TFrameContextType>,
    TFrameActionBodyType
  >;
  /** is loading the signer */
  isLoadingSigner: boolean;
  /** A function called when a frame button is clicked without a signer */
  onSignerlessFramePress: () => Promise<void>;
  logout: () => Promise<void>;
}

export type FrameGETRequest = {
  method: "GET";
  url: string;
};

export type FramePOSTRequest =
  | {
      method: "POST";
      source?: never;
      frameButton: FrameButtonPost | FrameButtonTx;
      signerStateActionContext: SignerStateActionContext;
      signerState: SignerStateInstance<any, any, any>;
      isDangerousSkipSigning: boolean;
      /**
       * The frame that was the source of the button press.
       */
      sourceFrame: Frame;
      sourceParseResult: ParseFramesWithReportsResult;
      specification: SupportedParsingSpecification;
    }
  | {
      method: "POST";
      source: "cast-action" | "composer-action";
      frameButton: FrameButtonPost | FrameButtonTx;
      signerStateActionContext: SignerStateActionContext;
      signerState: SignerStateInstance<any, any, any>;
      isDangerousSkipSigning: boolean;
      sourceFrame: undefined;
      sourceParseResult: undefined;
      specification: undefined;
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

export type FrameStackDone = FrameStackBase & {
  request: FrameRequest;
  response: Response;
  parseResult: ParseFramesWithReportsResult;
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
      parseResult: ParseFramesWithReportsResult;
      homeframeUrl: string;
    };

export type ButtonPressFunction = (arg: {
  frameButton: FrameButton;
  parseResult: ParseFramesWithReportsResult;
  specification: SupportedParsingSpecification;
  index: number;
  fetchFrameOverride?: FetchFrameFunction;
}) => void | Promise<void>;

type CastActionButtonPressFunctionArg = {
  castAction: CastActionResponse & {
    /** URL to cast action handler */
    url: string;
  };
  /**
   * @defaultValue false
   */
  clearStack?: boolean;
};

export type CastActionButtonPressFunction = (
  arg: CastActionButtonPressFunctionArg
) => Promise<void>;

type ComposerActionButtonPressFunctionArg = {
  castAction: CastActionResponse & {
    /** URL to cast action handler */
    url: string;
  };
  composerActionState: ComposerActionState;
  /**
   * @defaultValue false
   */
  clearStack?: boolean;
};

export type ComposerActionButtonPressFunction = (
  arg: ComposerActionButtonPressFunctionArg
) => Promise<void>;

export type CastActionRequest = Omit<
  FramePOSTRequest,
  | "method"
  | "frameButton"
  | "specification"
  | "sourceFrame"
  | "sourceParseResult"
  | "signerStateActionContext"
> & {
  method: "CAST_ACTION";
  action: CastActionResponse & {
    url: string;
  };
  signerStateActionContext: Omit<
    FramePOSTRequest["signerStateActionContext"],
    "frameButton" | "inputText" | "state"
  >;
};

export type ComposerActionRequest = Omit<
  FramePOSTRequest,
  | "method"
  | "frameButton"
  | "specification"
  | "sourceFrame"
  | "sourceParseResult"
  | "signerStateActionContext"
> & {
  method: "COMPOSER_ACTION";
  action: CastActionResponse & {
    url: string;
  };
  composerActionState: ComposerActionState;
  signerStateActionContext: Omit<
    FramePOSTRequest["signerStateActionContext"],
    "frameButton" | "inputText" | "state"
  >;
};

export type FetchFrameFunction = (
  request: FrameRequest | CastActionRequest | ComposerActionRequest,
  /**
   * If true, the frame stack will be cleared before the new frame is loaded
   *
   * @defaultValue false
   */
  shouldClear?: boolean
) => Promise<void>;

export type FrameState = {
  fetchFrame: FetchFrameFunction;
  clearFrameStack: () => void;
  dispatchFrameStack: Dispatch<FrameReducerActions>;
  /** The frame at the top of the stack (at index 0) */
  currentFrameStackItem: FramesStackItem | undefined;
  /** A stack of frames with additional context, with the most recent frame at index 0 */
  framesStack: FramesStack;
  inputText: string;
  setInputText: (s: string) => void;
  onButtonPress: ButtonPressFunction;
  /**
   * If this is not a non empty string then currentFrameStackItem is undefined as the frame state is disabled.
   */
  homeframeUrl: string | null | undefined;
  onCastActionButtonPress: CastActionButtonPressFunction;
  onComposerActionButtonPress: ComposerActionButtonPressFunction;
  specifications: SupportedParsingSpecification[];
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

// @TODO define minimal action body payload shape, because it is mostly the same
export type FrameActionBodyPayload = Record<string, unknown>;

export type FrameContext = Record<string, unknown>;
