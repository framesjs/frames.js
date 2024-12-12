import { useAccount, useConfig, type ConnectorEventMap } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import { useEffect, useRef } from "react";
import { useFreshRef } from "../../hooks/use-fresh-ref";
import type { EthProvider, EthProviderEventEmitterInterface } from "./types";
import { createEmitter } from "./event-emitter";

export type UseWagmiProviderOptions = {
  /**
   * @defaultValue false
   */
  debug?: boolean;
};

export function useWagmiProvider({
  debug = false,
}: UseWagmiProviderOptions = {}): EthProvider {
  const account = useAccount();
  const config = useConfig();
  const configRef = useFreshRef(config);
  const providerRef = useRef<EthProvider | null>(null);
  const emitterRef = useRef<EthProviderEventEmitterInterface | null>(null);

  const logDebugRef = useFreshRef(
    debug
      ? // eslint-disable-next-line no-console -- provide feedback to the developer
        console.debug
      : () => {
          // noop
        }
  );

  useEffect(() => {
    const connector = account.connector;

    if (!connector) {
      logDebugRef.current(
        "@frames.js/render/frame-app/provider/wagmi: No connector found, skipping event listeners registration"
      );

      return;
    }

    /**
     * This is weird case but sometimes when account is connecting
     * injected connector could miss the emitter property.
     *
     * Not sure if it is because it is connecting or something else
     * and the type here is saying that emitter is never nullable
     * but we actually ran into the case where it was null.
     *
     * So just to be sure.
     */
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- it actually can be nullable in some cases
    if (!connector.emitter) {
      logDebugRef.current(
        "@frames.js/render/frame-app/provider/wagmi: No emitter found on connector, skipping event listeners registration"
      );

      return;
    }

    function redispatchConnectEvent(event: ConnectorEventMap["connect"]): void {
      emitterRef.current?.emit("connect", {
        event: "connect",
        params: [
          {
            chainId: event.chainId.toString(),
          },
        ],
      });
    }
    function redispatchDisconnectEvent(): void {
      emitterRef.current?.emit("disconnect", {
        event: "disconnect",
        // @ts-expect-error -- this is weird, why there must be an error?
        params: [],
      });
    }
    function redispatchMessageEvent(event: ConnectorEventMap["message"]): void {
      emitterRef.current?.emit("message", {
        event: "message",
        params: [
          // @ts-expect-error -- this is correct but upstream type is requiring data property which is optional in wagmi
          event,
        ],
      });
    }
    function redispatchChangeEvent(event: ConnectorEventMap["change"]): void {
      if (event.accounts) {
        emitterRef.current?.emit("accountsChanged", {
          event: "accountsChanged",
          params: [event.accounts],
        });
      } else if (event.chainId) {
        emitterRef.current?.emit("chainChanged", {
          event: "chainChanged",
          params: [event.chainId.toString()],
        });
      }
    }

    connector.emitter.on("connect", redispatchConnectEvent);
    connector.emitter.on("disconnect", redispatchDisconnectEvent);
    connector.emitter.on("message", redispatchMessageEvent);
    connector.emitter.on("change", redispatchChangeEvent);

    return () => {
      connector.emitter.off("connect", redispatchConnectEvent);
      connector.emitter.off("disconnect", redispatchDisconnectEvent);
      connector.emitter.off("message", redispatchMessageEvent);
      connector.emitter.off("change", redispatchChangeEvent);
    };
  }, [account.connector]);

  // we don't want to call createEmitter repeately
  if (!emitterRef.current) {
    emitterRef.current = createEmitter();
  }

  // we don't want to reinstaniate the provider repeately
  if (!providerRef.current) {
    providerRef.current = {
      emitter: emitterRef.current,
      async request(params) {
        const walletClient = await getWalletClient(configRef.current);

        // @ts-expect-error(2345) -- this is correct but params are typed by ox library so different type but shape is the same
        return walletClient.request(params);
      },
    } satisfies EthProvider;
  }

  return providerRef.current;
}
