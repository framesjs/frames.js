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
  ButtonPressFunction,
  FrameContext,
  FrameRequest,
  FrameStackBase,
  FrameStackDoneRedirect,
  FrameStackMessage,
  FrameStackPending,
  FrameStackRequestError,
  OnConnectWalletFunc,
  OnMintArgs,
  OnSignatureFunc,
  OnTransactionFunc,
  SignerStateActionContext,
  SignerStateInstance,
} from "./types";
import type { FrameState, FrameStateAPI } from "./unstable-use-frame-state";

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

export type ResolveSignerFunctionArg = {
  parseResult: ParseFramesWithReportsResult;
};

export type ResolveSignerFunction = (
  arg: ResolveSignerFunctionArg
) => ResolvedSigner;

export type UseFrameOptions = {
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

export type FrameStackDone = FrameStackBase & {
  request: FrameRequest;
  response: Response;
  frameResult: ParseResultWithFrameworkDetails;
  status: "done";
};

export type FramesStackItem =
  | FrameStackPending
  | FrameStackDone
  | FrameStackDoneRedirect
  | FrameStackRequestError
  | FrameStackMessage;

export type UseFrameReturnValue = {
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
  dispatchFrameStack: Dispatch<FrameReducerActions>;
  /** The frame at the top of the stack (at index 0) */
  readonly currentFrameStackItem: FramesStackItem | undefined;
  /** A stack of frames with additional context, with the most recent frame at index 0 */
  readonly framesStack: FramesStack;
  readonly inputText: string;
  setInputText: (s: string) => void;
  onButtonPress: ButtonPressFunction<SignerStateActionContext<any, any>>;
  readonly homeframeUrl: string | null | undefined;
  /**
   * Resets the frame state to initial frame and resolves specification and signer again
   */
  reset: () => void;
};

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
      action: "DONE_WITH_ERROR_MESSAGE";
      pendingItem: FrameStackPending;
      item: Exclude<FrameStackMessage, { type: "info" }>;
    }
  | {
      action: "DONE";
      pendingItem: FrameStackPending;
      parseResult: ParseFramesWithReportsResult;
      response: Response;
      endTime: Date;
    }
  | { action: "CLEAR" }
  | {
      action: "RESET";
    }
  | {
      action: "RESET_INITIAL_FRAME";
      parseResult: ParseFramesWithReportsResult;
      homeframeUrl: string;
    };

export type UseFetchFrameOptions = {
  frameState: FrameState;
  frameStateAPI: FrameStateAPI;
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

export type FetchFrameFunction = (
  request: FrameRequest<SignerStateActionContext>,
  /**
   * If true, the frame stack will be cleared before the new frame is loaded
   *
   * @defaultValue false
   */
  shouldClear?: boolean
) => Promise<void>;
