import type { HostEndpoint } from "@farcaster/frame-host";
import type {
  AddFrameResult,
  FrameContext,
  SetPrimaryButton,
} from "@farcaster/frame-sdk";
import type { ParseFramesV2ResultWithFrameworkDetails } from "frames.js/frame-parsers";
import type { Provider } from "ox/Provider";
import type { Default as DefaultRpcSchema, ExtractRequest } from "ox/RpcSchema";

export type FrameClientConfig = FrameContext["client"];

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

export type FramePrimaryButton = Parameters<SetPrimaryButton>[0];

export type OnPrimaryButtonSetFunction = (
  options: FramePrimaryButton,
  pressedCallback: () => void
) => void;

export type OnAddFrameRequestedFunction = (
  frame: ParseFramesV2ResultWithFrameworkDetails
) => Promise<false | Extract<AddFrameResult, { added: true }>>;

/**
 * Function called when the frame app is being loaded and we need to resolve the client that renders the frame app
 */
export type ResolveClientFunction = (options: {
  signal: AbortSignal;
}) => Promise<FrameClientConfig>;

export type HostEndpointEmitter = Pick<
  HostEndpoint,
  "emit" | "emitEthProvider"
>;
