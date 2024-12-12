import type { Endpoint } from "@michalkvasnicak/comlink";
import { EventEmitter } from "eventemitter3";
import type { FrameEthProviderEvent } from "../types";
import type {
  EthProviderEventEmitterEventMap,
  EthProviderEventEmitterEvents,
  EthProviderEventEmitterInterface,
} from "./types";

type DisconnectEndpointFunction = () => void;

export class EthProviderEventEmitter
  extends EventEmitter<EthProviderEventEmitterEventMap>
  implements EthProviderEventEmitterInterface
{
  private debugMode = false;

  forwardToEndpoint(endpoint: Endpoint): DisconnectEndpointFunction {
    const forwardEvent = (event: EthProviderEventEmitterEvents): void => {
      switch (event.event) {
        case "accountsChanged": {
          endpoint.postMessage({
            ...event,
            type: "frameEthProviderEvent",
          } satisfies FrameEthProviderEvent);

          return;
        }
        case "chainChanged": {
          endpoint.postMessage({
            ...event,
            type: "frameEthProviderEvent",
          } satisfies FrameEthProviderEvent);

          return;
        }
        case "connect": {
          endpoint.postMessage({
            ...event,
            type: "frameEthProviderEvent",
          } satisfies FrameEthProviderEvent);

          return;
        }
        case "disconnect": {
          endpoint.postMessage({
            ...event,
            type: "frameEthProviderEvent",
          } satisfies FrameEthProviderEvent);

          return;
        }
        case "message": {
          endpoint.postMessage({
            ...event,
            type: "frameEthProviderEvent",
          } satisfies FrameEthProviderEvent);

          return;
        }
        default: {
          if (!this.debugMode) {
            return;
          }

          // eslint-disable-next-line no-console -- provide feedback to developer
          console.warn(
            "[@frames.js/render/frame-app/provider/event-emitter] Event not supported",
            event
          );
        }
      }
    };

    this.on("accountsChanged", forwardEvent);
    this.on("chainChanged", forwardEvent);
    this.on("connect", forwardEvent);
    this.on("disconnect", forwardEvent);
    this.on("message", forwardEvent);

    return () => {
      this.off("accountsChanged", forwardEvent);
      this.off("chainChanged", forwardEvent);
      this.off("connect", forwardEvent);
      this.off("disconnect", forwardEvent);
      this.off("message", forwardEvent);
    };
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

export function createEmitter(): EthProviderEventEmitterInterface {
  return new EthProviderEventEmitter();
}
