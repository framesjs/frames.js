import {
  createEmitter,
  type EventMap,
  from,
  type Emitter,
  UserRejectedRequestError,
} from "ox/Provider";
import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useFreshRef } from "../../hooks/use-fresh-ref";
import { useDebugLog } from "../../hooks/use-debug-log";
import type {
  EthProvider,
  OnSendTransactionRequestFunction,
  OnSignMessageRequestFunction,
  OnSignTypedDataRequestFunction,
} from "../types";
import {
  isEIP1193Provider,
  isSendTransactionRpcRequest,
  isSignMessageRpcRequest,
  isSignTypedDataRpcRequest,
} from "./helpers";

type UseWagmiProviderOptions = {
  /**
   * Enables debug logging
   *
   * @defaultValue false
   */
  debug?: boolean;
};

export function useWagmiProvider({
  debug = false,
}: UseWagmiProviderOptions = {}): EthProvider {
  const logDebug = useDebugLog(
    "@frames.js/render/frame-app/provider/wagmi",
    debug
  );
  const account = useAccount();
  const accountRef = useFreshRef(account);
  const emitterRef = useRef<Emitter | null>(null);
  const providerRef = useRef<EthProvider | null>(null);
  const onSendTransactionRequestRef =
    useRef<OnSendTransactionRequestFunction | null>(null);
  const onSignMessageRequestRef = useRef<OnSignMessageRequestFunction | null>(
    null
  );
  const onSignTypedDataRequestRef =
    useRef<OnSignTypedDataRequestFunction | null>(null);

  if (!providerRef.current) {
    emitterRef.current = createEmitter();
    providerRef.current = {
      ...from({
        ...emitterRef.current,
        async request(parameters) {
          const connector = accountRef.current.connector;

          if (!connector) {
            throw new Error(
              "No connector found, make sure you have wallet connected."
            );
          }

          const provider = await connector.getProvider();

          if (!isEIP1193Provider(provider)) {
            throw new Error(
              "Provider is not EIP-1193 compatible, make sure you have wallet connected."
            );
          }

          logDebug("sdk.ethProviderRequest() called", parameters);

          let isApproved = true;

          if (isSendTransactionRpcRequest(parameters)) {
            logDebug("sendTransaction request", parameters);
            isApproved = onSendTransactionRequestRef.current
              ? await onSendTransactionRequestRef.current(parameters)
              : true;
          } else if (isSignTypedDataRpcRequest(parameters)) {
            logDebug("signTypedData request", parameters);
            isApproved = onSignTypedDataRequestRef.current
              ? await onSignTypedDataRequestRef.current(parameters)
              : true;
          } else if (isSignMessageRpcRequest(parameters)) {
            logDebug("signMessage request", parameters);
            isApproved = onSignMessageRequestRef.current
              ? await onSignMessageRequestRef.current(parameters)
              : true;
          }

          if (!isApproved) {
            throw new UserRejectedRequestError(
              new Error("User rejected request")
            );
          }

          return provider.request(
            parameters as unknown as Parameters<typeof provider.request>[0]
          );
        },
      }),
      setEventHandlers(handlers) {
        onSendTransactionRequestRef.current = handlers.onSendTransactionRequest;
        onSignMessageRequestRef.current = handlers.onSignMessageRequest;
        onSignTypedDataRequestRef.current = handlers.onSignTypedDataRequest;
      },
    };
  }

  useEffect(() => {
    if (account.status !== "connected") {
      return;
    }

    const connector = account.connector;
    let cleanup = (): void => {
      // noop
    };

    // forward events to the provider
    void connector.getProvider().then((provider) => {
      if (!isEIP1193Provider(provider)) {
        return;
      }

      if (!emitterRef.current) {
        return;
      }

      const accountsChanged: EventMap["accountsChanged"] = (...args) => {
        emitterRef.current?.emit("accountsChanged", ...args);
      };
      const chainChanged: EventMap["chainChanged"] = (...args) => {
        emitterRef.current?.emit("chainChanged", ...args);
      };
      const connect: EventMap["connect"] = (...args) => {
        emitterRef.current?.emit("connect", ...args);
      };
      const disconnect: EventMap["disconnect"] = (...args) => {
        emitterRef.current?.emit("disconnect", ...args);
      };
      const message: EventMap["message"] = (...args) => {
        emitterRef.current?.emit("message", ...args);
      };

      provider.on("accountsChanged", accountsChanged);
      provider.on("chainChanged", chainChanged);
      provider.on("connect", connect);
      provider.on("disconnect", disconnect);
      provider.on("message", message);

      cleanup = () => {
        provider.removeListener("accountsChanged", accountsChanged);
        provider.removeListener("chainChanged", chainChanged);
        provider.removeListener("connect", connect);
        provider.removeListener("disconnect", disconnect);
        provider.removeListener("message", message);
      };
    });

    return () => {
      cleanup();
    };
  }, [account]);

  return providerRef.current;
}
