import {
  expose,
  windowEndpoint,
  type Endpoint,
} from "@michalkvasnicak/comlink";
import { type LegacyRef, useCallback, useEffect, useMemo, useRef } from "react";
import type {
  AddFrameResult,
  EthProviderRequest,
  FrameHost,
  SetPrimaryButton,
} from "@farcaster/frame-sdk";
import type { WebView, WebViewProps } from "react-native-webview";
import { z } from "zod";
import type { ParseFramesV2ResultWithFrameworkDetails } from "frames.js/frame-parsers";
import { UserRejectedRequestError } from "viem";
import type { ExtractRequest, Default as DefaultRpcSchema } from "ox/RpcSchema";
import { useFreshRef } from "./hooks/use-fresh-ref";
import type { FarcasterSignerState } from "./farcaster";
import type { FarcasterSigner } from "./identity/farcaster";
import type { EthProvider } from "./frame-app/provider/types";
import type { FrameClientConfig, FrameEvent } from "./frame-app/types";

export type SendTransactionRpcRequest = ExtractRequest<
  DefaultRpcSchema,
  "eth_sendTransaction"
>;

function isSendTransactionRpcRequest(
  request: Parameters<EthProviderRequest>[0]
): request is SendTransactionRpcRequest {
  return request.method === "eth_sendTransaction";
}

export type SignMessageRpcRequest = ExtractRequest<
  DefaultRpcSchema,
  "personal_sign"
>;

function isSignMessageRpcRequest(
  request: Parameters<EthProviderRequest>[0]
): request is SignMessageRpcRequest {
  return request.method === "personal_sign";
}

export type SignTypedDataRpcRequest = ExtractRequest<
  DefaultRpcSchema,
  "eth_signTypedData_v4"
>;

function isSignTypedDataRpcRequest(
  request: Parameters<EthProviderRequest>[0]
): request is SignTypedDataRpcRequest {
  return request.method === "eth_signTypedData_v4";
}

const defaultFrameRequestCache = new Set<string>();

export type FramePrimaryButton = Parameters<SetPrimaryButton>[0];

export type OnPrimaryButtonSetFunction = (
  options: FramePrimaryButton,
  pressedCallback: () => void
) => void;

export type OnAddFrameRequestedFunction = (
  frame: ParseFramesV2ResultWithFrameworkDetails
) => Promise<false | Extract<AddFrameResult, { added: true }>>;

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

function defaultOnSignerNotApproved(): void {
  // eslint-disable-next-line no-console -- provide feedback to the developer
  console.error(
    "@frames.js/render/unstable-use-frame-app",
    "onSignerNotApproved not implemented"
  );
}

const defaultOnAddFrameRequested: OnAddFrameRequestedFunction =
  function defaultOnAddFrameRequested() {
    // eslint-disable-next-line no-console -- provide feedback to the developer
    console.error(
      "@frames.js/render/unstable-use-frame-app",
      "onAddFrameRequested not implemented"
    );

    return Promise.reject(new Error("onAddFrameRequested not implemented"));
  };

const defaultOnSendTransactionRequest: OnSendTransactionRequestFunction =
  () => {
    // eslint-disable-next-line no-console -- provide feedback to the developer
    console.warn(
      "@frames.js/render/unstable-use-frame-app",
      "onSendTransactionRequest not implemented"
    );

    return Promise.resolve(true);
  };

const defaultOnSignMessageRequest: OnSignMessageRequestFunction = () => {
  // eslint-disable-next-line no-console -- provide feedback to the developer
  console.warn(
    "@frames.js/render/unstable-use-frame-app",
    "onSignMessageRequest not implemented"
  );

  return Promise.resolve(true);
};

const defaultOnSignTypedDataRequest: OnSignTypedDataRequestFunction = () => {
  // eslint-disable-next-line no-console -- provide feedback to the developer
  console.warn(
    "@frames.js/render/unstable-use-frame-app",
    "onSignTypedDataRequest not implemented"
  );

  return Promise.resolve(true);
};

type UseFrameAppOptions = {
  /**
   * @example
   * ```ts
   * import { useWagmiProvider } from '@frames.js/render/frame-app/provider/wagmi';
   *
   * function Component() {
   *  const provider = useWagmiProvider();
   *  const frameApp = useFrameApp({
   *    provider,
   *  });
   *
   *  //...
   * }
   * ```
   */
  provider: EthProvider;
  /**
   * Frame client that is rendering the app
   */
  client: FrameClientConfig;
  /**
   * Obtained from useFrame() onLaunchFrameButtonPressed() callback
   */
  frame: ParseFramesV2ResultWithFrameworkDetails;
  /**
   * Farcaster signer state. Must be already approved otherwise it will call onError
   * and getting context in frames app will be rejected
   *
   * @example
   * ```ts
   * import { useFarcasterSigner } from '@frames.js/render/identity/farcaster';
   *
   * function Component() {
   *  const farcasterSigner = useFarcasterSigner({
   *   // ...
   *  });
   *  const frameApp = useFrameApp({
   *   farcasterSigner,
   *   // ...
   *  });
   *
   *  //...
   * }
   * ```
   */
  farcasterSigner: FarcasterSignerState<FarcasterSigner | null>;
  /**
   * Called when app calls `ready` method.
   */
  onReady?: FrameHost["ready"];
  /**
   * Called when app calls `close` method.
   */
  onClose?: FrameHost["close"];
  /**
   * Called when app calls `openUrl` method.
   */
  onOpenUrl?: FrameHost["openUrl"];
  /**
   * Called when provided signer is not approved.
   */
  onSignerNotApproved?: () => void;
  /**
   * Called when app calls `setPrimaryButton` method.
   */
  onPrimaryButtonSet?: OnPrimaryButtonSetFunction;
  /**
   * Called when app calls `addFrame` method.
   *
   * If the frame manifest is invalid it is automatically rejected.
   * If the method has been called during the session more than once it immediatelly rejects
   */
  onAddFrameRequested?: OnAddFrameRequestedFunction;
  /**
   * Enabled debugging
   *
   * @defaultValue false
   */
  debug?: boolean;
  /**
   * Cache of frame app requests (calls to `addFrame` method).
   */
  addFrameRequestsCache?: Set<string>;
  onSendTransactionRequest?: OnSendTransactionRequestFunction;
  onSignMessageRequest?: OnSignMessageRequestFunction;
  onSignTypedDataRequest?: OnSignTypedDataRequestFunction;
};

type UnregisterEndpointFunction = () => void;

type RegisterEndpointFunction = (
  endpoint: Endpoint
) => UnregisterEndpointFunction;

type UseFrameAppReturn = {
  /**
   * Necessary to call with target endpoint to expose API to the frame.
   *
   * The function returns a function to unregister the endpoint listener. Make sure you call it
   * when the frame app is closed.
   */
  registerEndpoint: RegisterEndpointFunction;
};

/**
 * This hook is used to handle frames v2 apps.
 */
export function useFrameApp({
  provider,
  client,
  farcasterSigner,
  frame,
  onClose,
  onOpenUrl,
  onPrimaryButtonSet,
  onReady,
  onSignerNotApproved = defaultOnSignerNotApproved,
  debug = false,
  addFrameRequestsCache = defaultFrameRequestCache,
  onAddFrameRequested = defaultOnAddFrameRequested,
  onSendTransactionRequest = defaultOnSendTransactionRequest,
  onSignMessageRequest = defaultOnSignMessageRequest,
  onSignTypedDataRequest = defaultOnSignTypedDataRequest,
}: UseFrameAppOptions): UseFrameAppReturn {
  const providerRef = useFreshRef(provider);
  const clientRef = useFreshRef(client);
  const readyRef = useFreshRef(onReady);
  const closeRef = useFreshRef(onClose);
  const onOpenUrlRef = useFreshRef(onOpenUrl);
  const onSignerNotApprovedRef = useFreshRef(onSignerNotApproved);
  const onPrimaryButtonSetRef = useFreshRef(onPrimaryButtonSet);
  const farcasterSignerRef = useFreshRef(farcasterSigner);
  const onAddFrameRequestedRef = useFreshRef(onAddFrameRequested);
  const onSendTransactionRequestRef = useFreshRef(onSendTransactionRequest);
  const onSignMessageRequestRef = useFreshRef(onSignMessageRequest);
  const onSignTypedDataRequestRef = useFreshRef(onSignTypedDataRequest);
  const addFrameRequestsCacheRef = useFreshRef(addFrameRequestsCache);
  /**
   * Used to unregister message listener of previously exposed endpoint.
   */
  const unregisterPreviouslyExposedEndpointListenerRef =
    useRef<UnregisterEndpointFunction>(() => {
      // no-op
    });

  const logDebugRef = useFreshRef(
    debug
      ? // eslint-disable-next-line no-console -- provide feedback to the developer
        console.debug
      : () => {
          // no-op
        }
  );

  providerRef.current.emitter.setDebugMode(debug);

  const registerEndpoint = useCallback<RegisterEndpointFunction>(
    (endpoint) => {
      logDebugRef.current(
        "@frames.js/render/unstable-use-frame-app: registering endpoint"
      );
      unregisterPreviouslyExposedEndpointListenerRef.current();

      const signer = farcasterSignerRef.current.signer;

      if (signer?.status !== "approved") {
        onSignerNotApprovedRef.current();

        return () => {
          // no-op
        };
      }

      const frameUrl = frame.frame.button?.action?.url;

      if (!frameUrl) {
        // eslint-disable-next-line no-console -- provide feedback to the developer
        console.error(
          '@frames.js/render/unstable-use-frame-app: provided "frame" does not have an action url'
        );
        return () => {
          // no-op
        };
      }

      // bridge events to the frame app
      const disconnectEndpointFromEvents =
        providerRef.current.emitter.forwardToEndpoint(endpoint);

      const apiToExpose: FrameHost = {
        close() {
          logDebugRef.current(
            '@frames.js/render/unstable-use-frame-app: "close" called'
          );
          closeRef.current?.();
        },
        get context() {
          logDebugRef.current(
            '@frames.js/render/unstable-use-frame-app: "context" getter called'
          );
          return { user: { fid: signer.fid }, client: clientRef.current };
        },
        openUrl(url) {
          logDebugRef.current(
            '@frames.js/render/unstable-use-frame-app: "openUrl" called',
            url
          );
          onOpenUrlRef.current?.(url);
        },
        ready(options) {
          logDebugRef.current(
            '@frames.js/render/unstable-use-frame-app: "ready" called'
          );
          readyRef.current?.(options);
        },
        setPrimaryButton(options) {
          logDebugRef.current(
            '@frames.js/render/unstable-use-frame-app: "setPrimaryButton" called',
            options
          );
          onPrimaryButtonSetRef.current?.(options, () => {
            logDebugRef.current(
              '@frames.js/render/unstable-use-frame-app: "primaryButtonClicked" called'
            );
            endpoint.postMessage({
              type: "frameEvent",
              event: "primaryButtonClicked",
            } satisfies FrameEvent);
          });
        },
        async ethProviderRequest(parameters) {
          logDebugRef.current(
            '@frames.js/render/unstable-use-frame-app: "ethProviderRequest" called',
            parameters
          );

          let isApproved = true;

          if (isSendTransactionRpcRequest(parameters)) {
            isApproved = await onSendTransactionRequestRef.current(parameters);
          } else if (isSignTypedDataRpcRequest(parameters)) {
            isApproved = await onSignTypedDataRequestRef.current(parameters);
          } else if (isSignMessageRpcRequest(parameters)) {
            isApproved = await onSignMessageRequestRef.current(parameters);
          }

          if (!isApproved) {
            throw new UserRejectedRequestError(
              new Error("User rejected request")
            );
          }

          // @ts-expect-error -- type mismatch
          return providerRef.current.request(parameters);
        },
        ethProviderRequestV2(parameters) {
          logDebugRef.current(
            '@frames.js/render/unstable-use-frame-app: "ethProviderRequestV2" called',
            parameters
          );

          // this is stupid because previously it was enough just to not expose this method at all
          // but now it suddenly stopped working because somehow the error message was not the same
          // as @farcasters/frame-sdk was expecting
          return Promise.reject(new Error("cannot read property 'apply'"));
        },
        async addFrame() {
          if (
            frame.status !== "success" ||
            frame.manifest?.status !== "success"
          ) {
            return {
              added: false,
              reason: "invalid_domain_manifest",
            };
          }

          if (
            addFrameRequestsCacheRef.current.has(frame.frame.button.action.url)
          ) {
            return {
              added: false,
              reason: "rejected_by_user",
            };
          }

          logDebugRef.current(
            '@frames.js/render/unstable-use-frame-app: "addFrame" called'
          );

          const added = await onAddFrameRequestedRef.current(frame);

          logDebugRef.current(
            "@frames.js/render/unstable-use-frame-app: addFrameRequested",
            added
          );

          addFrameRequestsCacheRef.current.add(frame.frame.button.action.url);

          if (!added) {
            return {
              added: false,
              reason: "rejected_by_user",
            };
          }

          return added;
        },
      };

      unregisterPreviouslyExposedEndpointListenerRef.current = expose(
        apiToExpose,
        endpoint,
        [new URL(frameUrl).origin]
      );

      logDebugRef.current(
        "@frames.js/render/unstable-use-frame-app: endpoint registered"
      );

      return () => {
        disconnectEndpointFromEvents();
        unregisterPreviouslyExposedEndpointListenerRef.current();
      };
    },
    [
      logDebugRef,
      farcasterSignerRef,
      frame,
      providerRef,
      onSignerNotApprovedRef,
      closeRef,
      clientRef,
      onOpenUrlRef,
      readyRef,
      onPrimaryButtonSetRef,
      onSendTransactionRequestRef,
      onSignTypedDataRequestRef,
      onSignMessageRequestRef,
      addFrameRequestsCacheRef,
      onAddFrameRequestedRef,
    ]
  );

  return useMemo(() => {
    return { registerEndpoint };
  }, [registerEndpoint]);
}

type UseFrameAppInIframeReturn = {
  onLoad: (event: React.SyntheticEvent<HTMLIFrameElement>) => void;
  src: string | undefined;
};

/**
 * Handles frame app in iframe.
 *
 * On unmount it automatically unregisters the endpoint listener.
 *
 * @example
 * ```
 * import { useFrameAppInIframe } from '@frames.js/render/unstable-use-frame-app';
 * import { useWagmiProvider } from '@frames.js/render/frame-app/provider/wagmi';
 * import { useFarcasterSigner } from '@frames.js/render/identity/farcaster';
 *
 * function MyAppDialog() {
 *  const provider = useWagmiProvider();
 *  const farcasterSigner = useFarcasterSigner({
 *    // ...
 *  });
 *  const frameAppProps = useFrameAppInIframe({
 *    provider,
 *    farcasterSigner,
 *    // frame returned by useFrame() hook
 *    frame: frameState.frame,
 *    // ... handlers for frame app actions
 *  });
 *
 *  return <iframe {...frameAppProps} />;
 * }
 * ```
 */
export function useFrameAppInIframe(
  options: UseFrameAppOptions
): UseFrameAppInIframeReturn {
  const frameApp = useFrameApp(options);
  const unregisterEndpointRef = useRef<UnregisterEndpointFunction>(() => {
    // no-op
  });

  const logDebugRef = useFreshRef(
    options.debug
      ? // eslint-disable-next-line no-console -- provide feedback to the developer
        console.debug
      : () => {
          // no-op
        }
  );

  useEffect(() => {
    const logDebug = logDebugRef.current;

    return () => {
      logDebug("@frames.js/render/unstable-use-frame-app: unmounted");
      unregisterEndpointRef.current();
    };
  }, [logDebugRef]);

  return useMemo(() => {
    return {
      onLoad(event) {
        logDebugRef.current(
          "@frames.js/render/unstable-use-frame-app: iframe loaded"
        );

        if (!(event.currentTarget instanceof HTMLIFrameElement)) {
          // eslint-disable-next-line no-console -- provide feedback to the developer
          console.error(
            '@frames.js/render/unstable-use-frame-app: "onLoad" called but event target is not an iframe'
          );

          return;
        }
        if (!event.currentTarget.contentWindow) {
          return;
        }

        const endpoint = windowEndpoint(event.currentTarget.contentWindow);

        unregisterEndpointRef.current = frameApp.registerEndpoint(endpoint);
      },
      src: options.frame.frame.button?.action?.url,
    };
  }, [frameApp, logDebugRef, options.frame]);
}

type ReactNativeMessageEvent = {
  origin: string;
  data: Record<string, any>;
};

type MessageEventListener = (event: ReactNativeMessageEvent) => void;

type UseFrameAppInWebViewReturn = {
  source: WebViewProps["source"];
  onMessage: NonNullable<WebViewProps["onMessage"]>;
  injectedJavaScriptBeforeContentLoaded: NonNullable<
    WebViewProps["injectedJavaScriptBeforeContentLoaded"]
  >;
  ref: LegacyRef<WebView>;
};

const webViewEventParser = z.record(z.any());

/**
 * useFrameApp() hook for react-native-webview handling
 *
 * On unmount it automatically unregisters the endpoint listener.
 *
 * @example
 * ```
 * import { useFrameAppInWebView } from '@frames.js/render/unstable-use-frame-app';
 * import { useWagmiProvider } from '@frames.js/render/frame-app/provider/wagmi';
 * import { useFarcasterSigner } from '@frames.js/render/identity/farcaster';
 *
 * function MyAppDialog() {
 *   const provider = useWagmiProvider();
 *   const farcasterSigner = useFarcasterSigner({
 *     // ...
 *   });
 *   const frameAppProps = useFrameAppInWebView({
 *    provider,
 *    farcasterSigner,
 *    // frame returned by useFrame() hook
 *    frame: frameState.frame,
 *    // ... handlers for frame app actions
 *  });
 *
 *  return <WebView {...frameAppProps }/>;
 * }
 * ```
 */
export function useFrameAppInWebView(
  options: UseFrameAppOptions
): UseFrameAppInWebViewReturn {
  const ref = useRef<WebView | null>(null);
  const frameApp = useFrameApp(options);
  const unregisterEndpointRef = useRef<UnregisterEndpointFunction>(() => {
    // no-op
  });
  const messageListenersRef = useRef<Set<MessageEventListener> | null>(null);

  if (messageListenersRef.current === null) {
    messageListenersRef.current = new Set();
  }

  const logDebugRef = useFreshRef(
    options.debug
      ? // eslint-disable-next-line no-console -- provide feedback to the developer
        console.debug
      : () => {
          // noop
        }
  );

  useEffect(() => {
    const logDebug = logDebugRef.current;

    return () => {
      logDebug("@frames.js/render/unstable-use-frame-app: unmounted");

      unregisterEndpointRef.current();
      messageListenersRef.current?.clear();
    };
  }, [logDebugRef]);

  const frameUrl = options.frame.frame.button?.action?.url;

  return {
    source: frameUrl ? { uri: frameUrl } : undefined,
    onMessage(event) {
      logDebugRef.current(
        "@frames.js/render/unstable-use-frame-app: received an event",
        event.nativeEvent.data
      );

      try {
        const result = z
          .preprocess((value) => {
            return typeof value === "string" ? JSON.parse(value) : value;
          }, webViewEventParser)
          .safeParse(event.nativeEvent.data);

        if (!result.success) {
          logDebugRef.current(
            "@frames.js/render/unstable-use-frame-app: received event parsing error",
            result.error
          );
          return;
        }

        const messageEvent = {
          origin: new URL(event.nativeEvent.url).origin,
          data: result.data,
        };

        logDebugRef.current(
          "@frames.js/render/unstable-use-frame-app: received message from web view",
          messageEvent
        );

        messageListenersRef.current?.forEach((listener) => {
          listener(messageEvent);
        });
      } catch (error) {
        logDebugRef.current(
          "@frames.js/render/unstable-use-frame-app: event receiving error",
          error
        );
      }
    },
    // inject js code which handles message parsing between the frame app and the application.
    // react native web view is able to send only string messages so we need to serialize/deserialize them
    injectedJavaScriptBeforeContentLoaded: createMessageBridgeScript(
      options.debug ?? false
    ),
    ref(webView) {
      ref.current = webView;

      if (!webView) {
        return;
      }

      unregisterEndpointRef.current = frameApp.registerEndpoint({
        postMessage(message) {
          logDebugRef.current(
            "@frames.js/render/unstable-use-frame-app: sent message to web view",
            message
          );

          webView.postMessage(JSON.stringify(message));
        },
        addEventListener(type, listener) {
          if (type !== "message") {
            throw new Error("Invalid event");
          }

          if (typeof listener === "function") {
            messageListenersRef.current?.add(
              listener as unknown as MessageEventListener
            );

            logDebugRef.current(
              "@frames.js/render/unstable-use-frame-app: registered an event listener",
              listener
            );
          } else {
            throw new Error('Invalid listener, expected "function"');
          }
        },
        removeEventListener(type, listener) {
          if (type !== "message") {
            throw new Error("Invalid event");
          }

          if (typeof listener === "function") {
            messageListenersRef.current?.delete(
              listener as unknown as MessageEventListener
            );

            logDebugRef.current(
              "@frames.js/render/unstable-use-frame-app: removed an event listener",
              listener
            );
          } else {
            throw new Error('Invalid listener, expected "function"');
          }
        },
      });

      logDebugRef.current(
        "@frames.js/render/unstable-use-frame-app: registered web view endpoint"
      );
    },
  };
}

function createMessageBridgeScript(enableDebug: boolean): string {
  return /* javascript */ `
window.addEventListener("message", function $$handleMessageFromParentApplication(event) {
  // if event doesn't have a source then it means that it is coming from the parent application
  if (event.source !== window.parent) {
    try {
      if (${enableDebug.toString()}) {
        console.debug('@frames.js/render/unstable-use-frame-app: received message from parent application', event.data);
      }
      const data = JSON.parse(event.data);

      if (typeof data !== 'object' || data === null) {
        if (${enableDebug.toString()}) {
          console.debug('@frames.js/render/unstable-use-frame-app: received message parsing error: malformed data');
        }
        return;
      }
      
      if ('type' in data) {
        switch (data.type) {
          case 'frameEthProviderEvent': {
            // dispatch the event to document so it can be picked up by @farcaster/frame-sdk
            document.dispatchEvent(new MessageEvent('FarcasterFrameEthProviderEvent', {
              data: data,
              origin: window.location.origin,
              source: window.parent,
            }));

            if (${enableDebug.toString()}) {
              console.debug('@frames.js/render/unstable-use-frame-app: dispatched FarcasterFrameEthProviderEvent message to document', data);
            }

            return;
          }
          case 'frameEvent': {
            // dispatch the event to document so it can be picked up by @farcaster/frame-sdk
            document.dispatchEvent(new MessageEvent('FarcasterFrameEvent', {
              data: {
                // there is weird mismatch in @farcaster/frame-sdk when handling react native web view events
                // they don't use the same shape as the one in message {type: string, event: string}
                type: data.event,
              },
              origin: window.location.origin,
              source: window.parent,
            }));

            if (${enableDebug.toString()}) {
              console.debug('@frames.js/render/unstable-use-frame-app: dispatched FarcasterFrameEvent message to document', data);
            }

            return;
          }
        }
      }

      // unknown message type, dispatch it to document so it can be picked up by @farcaster/frame-sdk
      document.dispatchEvent(new MessageEvent('FarcasterFrameCallback', {
        data: data,
        origin: window.location.origin,
        source: window.parent,
      }));

      if (${enableDebug.toString()}) {
        console.debug('@frames.js/render/unstable-use-frame-app: dispatched FarcasterFrameCallback message to window', data);
      }
    } catch (error) {
      if (${enableDebug.toString()}) {
        console.debug('@frames.js/render/unstable-use-frame-app: received message error', error);
      }
    }
  }
});

true;
`.trim();
}
