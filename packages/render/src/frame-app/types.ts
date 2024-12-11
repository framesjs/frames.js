import type { EthProviderWireEvent, FrameContext } from "@farcaster/frame-sdk";

export type FrameEthProviderEvent = {
  type: "frameEthProviderEvent";
} & EthProviderWireEvent;

export type FrameEvent = {
  type: "frameEvent";
  event: "primaryButtonClicked";
};

/**
 * This is here just because it is inconsistent in farcaster/frame-sdk
 * Eventually this will be removed if they fix that.
 *
 * This is just a type that is used as a lead how to convert FrameEvent to FrameEventReactNative
 * in react native event bridge implementation.
 */
export type FrameEventReactNative = {
  type: "primaryButtonClicked";
};

export type FrameClientConfig = FrameContext["client"];
