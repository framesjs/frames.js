import type {
  FrameButtonLink,
  FrameButtonTx,
  SupportedParsingSpecification,
  TransactionTargetResponse,
  TransactionTargetResponseSendTransaction,
  TransactionTargetResponseSignTypedDataV4,
} from "frames.js";
import type {
  ParseFramesWithReportsResult,
  ParseResultWithFrameworkDetails,
} from "frames.js/frame-parsers";
import type { Dispatch } from "react";
import type {
  ComposerActionState,
  ErrorMessageResponse,
} from "frames.js/types";
import type {
  ButtonPressFunction,
  FrameContext,
  FrameGETRequest,
  FramePOSTRequest,
  FrameRequest,
  OnMintArgs,
  OnSignatureFunc,
  OnTransactionFunc,
  SignedFrameAction,
  SignerStateActionContext,
  SignerStateInstance,
} from "./types";

export type ResolvedSigner = {
  /**
   * Signer that will be used to sign all actions that require signers.
   */
  signerState: SignerStateInstance<any, any, any>;
  /**
   * The context of this frame, used for generating Frame Action payloads
   */
  frameContext?: FrameContext;
};

export type OnTransactionFunction = OnTransactionFunc;

export type OnSignatureFunction = OnSignatureFunc;

export type OnMintFunction = (t: OnMintArgs) => void;

export type OnErrorFunction = (error: Error) => void;

export type OnLinkButtonClickFunction = (button: FrameButtonLink) => void;

export type OnRedirectFunction = (location: URL) => void;

export type ResolveSignerFunctionArg = {
  parseResult: ParseFramesWithReportsResult;
};

export type ResolveSignerFunction = (
  arg: ResolveSignerFunctionArg
) => ResolvedSigner;

export type ResolveAddressFunction = () => Promise<`0x${string}` | null>;

export type UseFrameOptions<
  TExtraDataPending = unknown,
  TExtraDataDone = unknown,
  TExtraDataDoneRedirect = unknown,
  TExtraDataRequestError = unknown,
  TExtraDataMesssage = unknown,
> = {
  /**
   * The frame state to be used for the frame. Allows to store extra data on stack items.
   */
  frameStateHook?: (
    options: Pick<
      UseFrameStateOptions<
        TExtraDataPending,
        TExtraDataDone,
        TExtraDataDoneRedirect,
        TExtraDataRequestError,
        TExtraDataMesssage
      >,
      "initialFrameUrl" | "initialParseResult" | "resolveSpecification"
    >
  ) => UseFrameStateReturn<
    TExtraDataPending,
    TExtraDataDone,
    TExtraDataDoneRedirect,
    TExtraDataRequestError,
    TExtraDataMesssage
  >;
  /** the route used to POST frame actions. The post_url will be added as a the `url` query parameter */
  frameActionProxy: string;
  /** the route used to GET the initial frame via proxy */
  frameGetProxy: string;
  /**
   * Called on initial frame load.
   *
   * The function is called again if:
   * 1. initial frame changes
   * 2. homeframeUrl changes
   * 3. reset() method on FrameState is called
   */
  resolveSigner: ResolveSignerFunction;
  /**
   * The url of the homeframe, if null / undefined won't load a frame nor render it.
   *
   * If the value changes the frame state is reset.
   */
  homeframeUrl: string | null | undefined;
  /**
   * The initial frame. if not specified will fetch it from the homeframeUrl prop.
   *
   * Value should be memoized otherwise it will reset the frame state.
   */
  frame?: ParseFramesWithReportsResult | null;
  /**
   * Called before onTransaction/onSignature is invoked to obtain an address to use.
   *
   * If the function returns null onTransaction/onSignature will not be called.
   *
   * Sent to the frame on transaction requests.
   */
  resolveAddress: ResolveAddressFunction;
  /** a function to handle mint buttons */
  onMint?: OnMintFunction;
  /** a function to handle transaction buttons that returned transaction data from the target, returns the transaction hash or null */
  onTransaction?: OnTransactionFunction;
  /** Transaction data suffix */
  transactionDataSuffix?: `0x${string}`;
  /** A function to handle transaction buttons that returned signature data from the target, returns signature hash or null */
  onSignature?: OnSignatureFunction;
  /**
   * Extra data appended to the frame action payload
   */
  extraButtonRequestPayload?: Record<string, unknown>;
  /**
   * This function can be used to customize how error is reported to the user.
   */
  onError?: OnErrorFunction;
  /**
   * This function can be used to customize how the link button click is handled.
   */
  onLinkButtonClick?: OnLinkButtonClickFunction;
} & Partial<
  Pick<
    UseFetchFrameOptions,
    | "fetchFn"
    | "onRedirect"
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

export type FrameStackBase = {
  id: number;
  url: string;
};

export type FrameStackPostPending<TExtra = unknown> = Omit<
  FrameStackBase,
  "responseStatus" | "responseBody"
> & {
  method: "POST";
  status: "pending";
  request: FramePOSTRequest;
  extra: TExtra;
};

export type FrameStackGetPending<TExtra = unknown> = Omit<
  FrameStackBase,
  "responseStatus" | "responseBody"
> & {
  method: "GET";
  status: "pending";
  request: FrameGETRequest;
  extra: TExtra;
};

export type FrameStackPending<TExtra = unknown> =
  | FrameStackGetPending<TExtra>
  | FrameStackPostPending<TExtra>;

export type FrameStackDone<TExtra = unknown> = FrameStackBase & {
  request: FrameRequest;
  frameResult: ParseResultWithFrameworkDetails;
  status: "done";
  extra: TExtra;
};

export type FrameStackDoneRedirect<TExtra = unknown> = FrameStackBase & {
  request: FramePOSTRequest;
  location: string;
  status: "doneRedirect";
  extra: TExtra;
};

export type FrameStackRequestError<TExtra = unknown> = FrameStackBase & {
  request: FrameRequest;
  status: "requestError";
  requestError: Error;
  extra: TExtra;
};

export type FrameStackMessage<TExtra = unknown> = FrameStackBase & {
  request: FramePOSTRequest;
  status: "message";
  message: string;
  type: "info" | "error";
  extra: TExtra;
};

export type FramesStackItem<
  TExtraPending = unknown,
  TExtraDone = unknown,
  TExtraDoneRedirect = unknown,
  TExtraRequestError = unknown,
  TExtraMesssage = unknown,
> =
  | FrameStackPending<TExtraPending>
  | FrameStackDone<TExtraDone>
  | FrameStackDoneRedirect<TExtraDoneRedirect>
  | FrameStackRequestError<TExtraRequestError>
  | FrameStackMessage<TExtraMesssage>;

export type UseFrameReturnValue<
  TExtraDataPending = unknown,
  TExtraDataDone = unknown,
  TExtraDataDoneRedirect = unknown,
  TExtraDataRequestError = unknown,
  TExtraDataMesssage = unknown,
> = {
  /**
   * The signer state is set once it is resolved (on initial frame render)
   */
  readonly signerState: SignerStateInstance | undefined;
  /**
   * The specification is set once it is resolved (on initial frame render)
   */
  readonly specification: SupportedParsingSpecification | undefined;
  fetchFrame: FetchFrameFunction;
  clearFrameStack: () => void;
  dispatchFrameStack: Dispatch<
    FrameReducerActions<
      TExtraDataPending,
      TExtraDataDone,
      TExtraDataDoneRedirect,
      TExtraDataRequestError,
      TExtraDataMesssage
    >
  >;
  /** The frame at the top of the stack (at index 0) */
  readonly currentFrameStackItem:
    | FramesStackItem<
        TExtraDataPending,
        TExtraDataDone,
        TExtraDataDoneRedirect,
        TExtraDataRequestError,
        TExtraDataMesssage
      >
    | undefined;
  /** A stack of frames with additional context, with the most recent frame at index 0 */
  readonly framesStack: FramesStack<
    TExtraDataPending,
    TExtraDataDone,
    TExtraDataDoneRedirect,
    TExtraDataRequestError,
    TExtraDataMesssage
  >;
  readonly inputText: string;
  setInputText: (s: string) => void;
  onButtonPress: ButtonPressFunction<SignerStateActionContext<any, any>>;
  readonly homeframeUrl: string | null | undefined;
  /**
   * Resets the frame state to initial frame and resolves specification and signer again
   */
  reset: () => void;
};

export type FramesStack<
  TExtraPending = unknown,
  TExtraDone = unknown,
  TExtraDoneRedirect = unknown,
  TExtraRequestError = unknown,
  TExtraMesssage = unknown,
> = FramesStackItem<
  TExtraPending,
  TExtraDone,
  TExtraDoneRedirect,
  TExtraRequestError,
  TExtraMesssage
>[];

export type FrameReducerActions<
  TExtraPending = unknown,
  TExtraDone = unknown,
  TExtraDoneRedirect = unknown,
  TExtraRequestError = unknown,
  TExtraMessage = unknown,
> =
  | {
      action: "LOAD";
      item: FrameStackPending<TExtraPending>;
    }
  | {
      action: "REQUEST_ERROR";
      pendingItem: FrameStackPending<TExtraPending>;
      item: FrameStackRequestError<TExtraRequestError>;
    }
  | {
      action: "DONE_REDIRECT";
      pendingItem: FrameStackPending<TExtraPending>;
      item: FrameStackDoneRedirect<TExtraDoneRedirect>;
    }
  | {
      action: "DONE_WITH_ERROR_MESSAGE";
      pendingItem: FrameStackPending<TExtraPending>;
      item: Exclude<FrameStackMessage<TExtraMessage>, { type: "info" }>;
    }
  | {
      action: "DONE";
      pendingItem: FrameStackPending<TExtraPending>;
      parseResult: ParseFramesWithReportsResult;
      extra: TExtraDone;
    }
  | { action: "CLEAR" }
  | {
      action: "RESET";
    }
  | {
      action: "RESET_INITIAL_FRAME";
      parseResult: ParseFramesWithReportsResult;
      homeframeUrl: string;
      extra: TExtraDone;
    };

export type OnTransactionDataStartEvent = {
  button: FrameButtonTx;
};

export type OnTransactionDataStartFunction = (
  event: OnTransactionDataStartEvent
) => void;

type OnTransactionDataSuccessEvent = {
  button: FrameButtonTx;
  data: TransactionTargetResponse;
};

export type OnTransactionDataSuccessFunction = (
  event: OnTransactionDataSuccessEvent
) => void;

export type OnTransactionStartEvent = {
  button: FrameButtonTx;
  data: TransactionTargetResponseSendTransaction;
};

export type OnTransactionStartFunction = (
  event: OnTransactionStartEvent
) => void;

export type OnTransactionSuccessEvent = {
  button: FrameButtonTx;
};

export type OnTransactionSuccessFunction = (
  event: OnTransactionSuccessEvent
) => void;

export type OnSignatureStartEvent = {
  button: FrameButtonTx;
  data: TransactionTargetResponseSignTypedDataV4;
};

export type OnSignatureStartFunction = (event: OnSignatureStartEvent) => void;

export type OnSignatureSuccessEvent = {
  button: FrameButtonTx;
};

export type OnSignatureSuccessFunction = (
  event: OnSignatureSuccessEvent
) => void;

type OnTransactionProcessingStartEvent = {
  button: FrameButtonTx;
  transactionId: `0x${string}`;
};

export type OnTransactionProcessingStartFunction = (
  event: OnTransactionProcessingStartEvent
) => void;

type OnTransactionProcessingSuccessEvent = {
  button: FrameButtonTx;
  transactionId: `0x${string}`;
};

export type OnTransactionProcessingSuccessFunction = (
  event: OnTransactionProcessingSuccessEvent
) => void;

export type UseFetchFrameOptions<
  TExtraPending = unknown,
  TExtraDone = unknown,
  TExtraDoneRedirect = unknown,
  TExtraRequestError = unknown,
  TExtraMesssage = unknown,
> = {
  frameState: FrameState;
  frameStateAPI: FrameStateAPI<
    TExtraPending,
    TExtraDone,
    TExtraDoneRedirect,
    TExtraRequestError,
    TExtraMesssage
  >;
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
  onTransaction: OnTransactionFunction;
  /** Transaction data suffix */
  transactionDataSuffix?: `0x${string}`;
  onSignature: OnSignatureFunction;
  /**
   * This function can be used to customize how error is reported to the user.
   *
   * Should be memoized
   */
  onError?: OnErrorFunction;
  /**
   * Custom fetch compatible function used to make requests.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
   */
  fetchFn: typeof fetch;
  /**
   * This function is called when the frame returns a redirect in response to post_redirect button click.
   */
  onRedirect: OnRedirectFunction;
  /**
   * Called when user presses the tx button just before the action is signed and sent to the server
   * to obtain the transaction data.
   */
  onTransactionDataStart?: OnTransactionDataStartFunction;
  /**
   * Called when transaction data has been successfully returned from the server.
   */
  onTransactionDataSuccess?: OnTransactionDataSuccessFunction;
  /**
   * Called when anything failed between onTransactionDataStart and obtaining the transaction data.
   */
  onTransactionDataError?: OnErrorFunction;
  /**
   * Called before onTransaction() is called
   * Called after onTransactionDataSuccess() is called
   */
  onTransactionStart?: OnTransactionStartFunction;
  /**
   * Called when onTransaction() returns a transaction id
   */
  onTransactionSuccess?: OnTransactionSuccessFunction;
  /**
   * Called when onTransaction() fails to return a transaction id
   */
  onTransactionError?: OnErrorFunction;
  /**
   * Called before onSignature() is called
   * Called after onTransactionDataSuccess() is called
   */
  onSignatureStart?: OnSignatureStartFunction;
  /**
   * Called when onSignature() returns a transaction id
   */
  onSignatureSuccess?: OnSignatureSuccessFunction;
  /**
   * Called when onSignature() fails to return a transaction id
   */
  onSignatureError?: OnErrorFunction;
  /**
   * Called after either onSignatureSuccess() or onTransactionSuccess() is called just before the transaction is sent to the server.
   */
  onTransactionProcessingStart?: OnTransactionProcessingStartFunction;
  /**
   * Called after the transaction has been successfully sent to the server and returned a success response.
   */
  onTransactionProcessingSuccess?: OnTransactionProcessingSuccessFunction;
  /**
   * Called when the transaction has been sent to the server but the server returned an error.
   */
  onTransactionProcessingError?: OnErrorFunction;
};

export type FetchFrameFunction = (
  request: FrameRequest<SignerStateActionContext>,
  /**
   * If true, the frame stack will be cleared before the new frame is loaded
   *
   * @defaultValue false
   */
  shouldClear?: boolean
) => Promise<void>;

type MarkAsDoneArg<TExtraPending> = {
  pendingItem:
    | FrameStackGetPending<TExtraPending>
    | FrameStackPostPending<TExtraPending>;
  endTime: Date;
  response: Response;
  parseResult: ParseFramesWithReportsResult;
  responseBody: unknown;
};

type MarkAsDonwWithRedirectArg<TExtraPending> = {
  pendingItem: FrameStackPostPending<TExtraPending>;
  endTime: Date;
  location: string;
  response: Response;
  responseBody: unknown;
};

type MarkAsDoneWithErrorMessageArg<TExtraPending> = {
  pendingItem: FrameStackPostPending<TExtraPending>;
  endTime: Date;
  response: Response;
  responseData: ErrorMessageResponse;
};

type MarkAsFailedArg<TExtraPending> = {
  pendingItem:
    | FrameStackGetPending<TExtraPending>
    | FrameStackPostPending<TExtraPending>;
  endTime: Date;
  requestError: Error;
  response: Response | null;
  responseBody: unknown;
  responseStatus: number;
};

type MarkAsFailedWithRequestErrorArg<TExtraPending> = {
  endTime: Date;
  pendingItem: FrameStackPostPending<TExtraPending>;
  error: Error;
  response: Response;
  responseBody: unknown;
};

type CreateGetPendingItemArg = {
  request: FrameGETRequest;
};

type CreatePOSTPendingItemArg = {
  action: SignedFrameAction;
  request: FramePOSTRequest<any>;
  /**
   * Optional, allows to override the start time
   *
   * @defaultValue new Date()
   */
  startTime?: Date;
};

export type UseFrameStateOptions<
  TExtraPending = unknown,
  TExtraDone = unknown,
  TExtraDoneRedirect = unknown,
  TExtraRequestError = unknown,
  TExtraMesssage = unknown,
> = {
  initialParseResult?: ParseFramesWithReportsResult | null;
  initialFrameUrl?: string | null;
  initialPendingExtra?: TExtraPending;
  resolveSpecification: ResolveSignerFunction;
  resolveGETPendingExtra?: (arg: CreateGetPendingItemArg) => TExtraPending;
  resolvePOSTPendingExtra?: (arg: CreatePOSTPendingItemArg) => TExtraPending;
  resolveDoneExtra?: (arg: MarkAsDoneArg<TExtraPending>) => TExtraDone;
  resolveDoneRedirectExtra?: (
    arg: MarkAsDonwWithRedirectArg<TExtraPending>
  ) => TExtraDoneRedirect;
  resolveDoneWithErrorMessageExtra?: (
    arg: MarkAsDoneWithErrorMessageArg<TExtraPending>
  ) => TExtraMesssage;
  resolveFailedExtra?: (
    arg: MarkAsFailedArg<TExtraPending>
  ) => TExtraRequestError;
  resolveFailedWithRequestErrorExtra?: (
    arg: MarkAsFailedWithRequestErrorArg<TExtraPending>
  ) => TExtraRequestError;
};

export type FrameStateAPI<
  TExtraPending = unknown,
  TExtraDone = unknown,
  TExtraDoneRedirect = unknown,
  TExtraRequestError = unknown,
  TExtraMesssage = unknown,
> = {
  dispatch: React.Dispatch<
    FrameReducerActions<
      TExtraPending,
      TExtraDone,
      TExtraDoneRedirect,
      TExtraRequestError,
      TExtraMesssage
    >
  >;
  clear: () => void;
  createGetPendingItem: (
    arg: CreateGetPendingItemArg
  ) => FrameStackGetPending<TExtraPending>;
  createPostPendingItem: <
    TSignerStateActionContext extends SignerStateActionContext<any, any>,
  >(arg: {
    action: SignedFrameAction;
    request: FramePOSTRequest<TSignerStateActionContext>;
    /**
     * Optional, allows to override the start time
     *
     * @defaultValue new Date()
     */
    startTime?: Date;
  }) => FrameStackPostPending<TExtraPending>;
  markAsDone: (arg: MarkAsDoneArg<TExtraPending>) => void;
  markAsDoneWithRedirect: (
    arg: MarkAsDonwWithRedirectArg<TExtraPending>
  ) => void;
  markAsDoneWithErrorMessage: (
    arg: MarkAsDoneWithErrorMessageArg<TExtraPending>
  ) => void;
  markAsFailed: (arg: MarkAsFailedArg<TExtraPending>) => void;
  markAsFailedWithRequestError: (
    arg: MarkAsFailedWithRequestErrorArg<TExtraPending>
  ) => void;
  /**
   * If arg is omitted it will reset the frame stack to initial frame and resolves the specification again.
   * Otherwise it will set the frame state to provided values and resolve the specification.
   */
  reset: (arg?: {
    homeframeUrl: string;
    parseResult: ParseFramesWithReportsResult;
  }) => void;
};

export type UseFrameStateReturn<
  TExtraPending = unknown,
  TExtraDone = unknown,
  TExtraDoneRedirect = unknown,
  TExtraRequestError = unknown,
  TExtraMesssage = unknown,
> = [
  FrameState<
    TExtraPending,
    TExtraDone,
    TExtraDoneRedirect,
    TExtraRequestError,
    TExtraMesssage
  >,
  FrameStateAPI<
    TExtraPending,
    TExtraDone,
    TExtraDoneRedirect,
    TExtraRequestError,
    TExtraMesssage
  >,
];

export type FrameState<
  TExtraPending = unknown,
  TExtraDone = unknown,
  TExtraDoneRedirect = unknown,
  TExtraRequestError = unknown,
  TExtraMesssage = unknown,
> =
  | {
      type: "initialized";
      stack: FramesStack<
        TExtraPending,
        TExtraDone,
        TExtraDoneRedirect,
        TExtraRequestError,
        TExtraMesssage
      >;
      signerState: SignerStateInstance;
      frameContext: FrameContext;
      specification: SupportedParsingSpecification;
      homeframeUrl: string;
      parseResult: ParseFramesWithReportsResult;
    }
  | {
      type: "not-initialized";
      stack: FramesStack<
        TExtraPending,
        TExtraDone,
        TExtraDoneRedirect,
        TExtraRequestError,
        TExtraMesssage
      >;
    };

export type SignerStateComposerActionContext = {
  fid: number;
  url: string;
  state: ComposerActionState;
};

export type SignerComposerActionResult = {
  untrustedData: {
    fid: number;
    url: string;
    messageHash: `0x${string}`;
    timestamp: number;
    network: number;
    buttonIndex: number;
    state: string;
  };
  trustedData: {
    messageBytes: string;
  };
};

/**
 * Used to sign composer action
 */
export type SignComposerActionFunction = (
  signerPrivateKey: string,
  actionContext: SignerStateComposerActionContext
) => Promise<SignerComposerActionResult>;

export type SignerStateCastActionContext = {
  fid: number;
  /**
   * The id of the cast from which the user initiated the action
   */
  castId: {
    fid: number;
    hash: `0x${string}`;
  };
  /**
   * Cast action post url
   */
  postUrl: string;
};

export type SignerCastActionResult = {
  untrustedData: {
    fid: number;
    url: string;
    messageHash: `0x${string}`;
    timestamp: number;
    network: number;
    buttonIndex: number;
  };
  trustedData: {
    messageBytes: string;
  };
};

/**
 * Used to sign cast action
 */
export type SignCastActionFunction = (
  signerPrivateKey: string,
  actionContext: SignerStateCastActionContext
) => Promise<SignerCastActionResult>;
