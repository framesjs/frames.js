import type {
  HostEndpoint,
  Context,
  SetPrimaryButtonOptions,
  AddFrame,
  FrameHost,
  SignIn,
} from "@farcaster/frame-host";
import type { ParseFramesV2ResultWithFrameworkDetails } from "frames.js/frame-parsers";
import type { Provider } from "ox/Provider";
import type { Default as DefaultRpcSchema, ExtractRequest } from "ox/RpcSchema";

export type SendTransactionRpcRequest = ExtractRequest<
  DefaultRpcSchema,
  "eth_sendTransaction"
>;

export type SignMessageRpcRequest = ExtractRequest<
  DefaultRpcSchema,
  "personal_sign"
>;

export type SignTypedDataRpcRequest = ExtractRequest<
  DefaultRpcSchema,
  "eth_signTypedData_v4"
>;

export type EthProvider = Provider<undefined, DefaultRpcSchema> & {
  setEventHandlers: (handlers: SharedEthProviderEventHandlers) => void;
};

/**
 * Function called when the frame app requests sending transaction.
 *
 * If false is returned then the request is cancelled and user rejected error is thrown
 */
export type OnSendTransactionRequestFunction = (
  request: SendTransactionRpcRequest
) => Promise<boolean>;

/**
 * Function called when the frame app requests signing message.
 *
 * If false is returned signing is cancelled and user rejected error is thrown
 */
export type OnSignMessageRequestFunction = (
  request: SignMessageRpcRequest
) => Promise<boolean>;

/**
 * Function called when the frame app requests signing typed data.
 *
 * If false is returned then the request is cancelled and user rejected error is thrown
 */
export type OnSignTypedDataRequestFunction = (
  request: SignTypedDataRpcRequest
) => Promise<boolean>;

export type SharedEthProviderEventHandlers = {
  onSendTransactionRequest: OnSendTransactionRequestFunction;
  onSignMessageRequest: OnSignMessageRequestFunction;
  onSignTypedDataRequest: OnSignTypedDataRequestFunction;
};

export type FramePrimaryButton = SetPrimaryButtonOptions;

export type OnPrimaryButtonSetFunction = (
  options: FramePrimaryButton,
  pressedCallback: () => void
) => void;

/**
 * Returns false if user rejected the request, otherwise it returns the notification details
 */
export type OnAddFrameRequestedFunction = (
  frame: ParseFramesV2ResultWithFrameworkDetails
) => Promise<false | Required<AddFrame.AddFrameResult>>;

export type OnEIP6963RequestProviderRequestedFunctionOptions = {
  endpoint: HostEndpoint;
};

/**
 * Function that must emit eip6963:announceProvider event on endpoint to announce available providers
 */
export type OnEIP6963RequestProviderRequestedFunction = (
  options: OnEIP6963RequestProviderRequestedFunctionOptions
) => unknown;

export type OnSignInFunctionOptions = SignIn.SignInOptions & {
  frame: ParseFramesV2ResultWithFrameworkDetails;
};

export type OnSignInFunction = (
  options: OnSignInFunctionOptions
) => Promise<SignIn.SignInResult>;

export type OnViewProfileFunction = FrameHost["viewProfile"];

export type FrameContext = Context.FrameContext;

export type ResolveContextFunctionOptions = {
  /**
   * Called when hook is unmounted
   */
  signal: AbortSignal;
};

/**
 * Function called when the frame app is loaded and needs a context to be rendered
 */
export type ResolveContextFunction = (
  options: ResolveContextFunctionOptions
) => Promise<FrameContext>;

export type HostEndpointEmitter = Pick<
  HostEndpoint,
  "emit" | "emitEthProvider"
>;
