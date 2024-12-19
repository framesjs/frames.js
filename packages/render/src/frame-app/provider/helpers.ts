import type { EthProviderRequest } from "@farcaster/frame-host";
import type { EIP1193Provider } from "viem";
import type {
  SendTransactionRpcRequest,
  SignMessageRpcRequest,
  SignTypedDataRpcRequest,
} from "../types";

export function isSendTransactionRpcRequest(
  request: Parameters<EthProviderRequest>[0]
): request is SendTransactionRpcRequest {
  return request.method === "eth_sendTransaction";
}

export function isSignMessageRpcRequest(
  request: Parameters<EthProviderRequest>[0]
): request is SignMessageRpcRequest {
  return request.method === "personal_sign";
}

export function isSignTypedDataRpcRequest(
  request: Parameters<EthProviderRequest>[0]
): request is SignTypedDataRpcRequest {
  return request.method === "eth_signTypedData_v4";
}

export function isEIP1193Provider(
  provider: unknown
): provider is EIP1193Provider {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "request" in provider &&
    typeof provider.request === "function" &&
    "on" in provider &&
    typeof provider.on === "function" &&
    "removeListener" in provider &&
    typeof provider.removeListener === "function"
  );
}
