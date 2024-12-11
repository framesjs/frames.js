import type { Provider, RpcSchema } from "ox";
import type { EthProviderWireEvent } from "@farcaster/frame-sdk";
import type { EventEmitter } from "eventemitter3";
import type { Endpoint } from "@michalkvasnicak/comlink";

export type EthProviderRequestFunction = Provider.RequestFn<RpcSchema.Default>;

export type EthProviderEventEmitterEvents = EthProviderWireEvent;

export type EthProviderEventEmitterEventMap = {
  [K in EthProviderWireEvent["event"]]: [
    Extract<EthProviderWireEvent, { event: K }>,
  ];
};

export interface EthProviderEventEmitterInterface
  extends EventEmitter<EthProviderEventEmitterEventMap> {
  /**
   * Connects the endpoint to the event emitter, this means
   * that any known events will be forwarded to the endpoint.
   *
   * Returns a function that disconnects the endpoint from the event emitter.
   */
  forwardToEndpoint: (endpoint: Endpoint) => () => void;

  setDebugMode: (enabled: boolean) => void;
}

export type EthProvider = {
  readonly emitter: EthProviderEventEmitterInterface;
  readonly request: EthProviderRequestFunction;
};
