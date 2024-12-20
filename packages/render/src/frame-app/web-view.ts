import { exposeToEndpoint } from "@farcaster/frame-host";
import {
  createWebViewRpcEndpoint,
  type WebViewEndpoint,
} from "@farcaster/frame-host-react-native";
import type { WebView, WebViewProps } from "react-native-webview";
import type { LegacyRef } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useFrameApp,
  type UseFrameAppOptions,
  type UseFrameAppReturn,
} from "../use-frame-app";
import { useFreshRef } from "../hooks/use-fresh-ref";
import { useDebugLog } from "../hooks/use-debug-log";
import { assertNever } from "../assert-never";
import type { HostEndpointEmitter } from "./types";

type UseFrameAppReturnSuccess = Extract<
  UseFrameAppReturn,
  { status: "success" }
>;

export type UseFrameAppInWebViewReturn =
  | Exclude<UseFrameAppReturn, { status: "success" }>
  | (Omit<UseFrameAppReturnSuccess, "emitter"> & {
      emitter: HostEndpointEmitter;
      webViewProps: {
        source: WebViewProps["source"];
        onMessage: NonNullable<WebViewProps["onMessage"]>;
        ref: LegacyRef<WebView>;
      };
    });

/**
 * useFrameApp() hook for react-native-webview handling
 *
 * On unmount it automatically unregisters the endpoint listener.
 *
 * @example
 * ```
 * import { useFrameAppInWebView } from '@frames.js/render/frame-app/web-view';
 * import { useWagmiProvider } from '@frames.js/render/frame-app/provider/wagmi';
 * import { useFarcasterSigner } from '@frames.js/render/identity/farcaster';
 *
 * function MyAppDialog() {
 *   const provider = useWagmiProvider();
 *   const farcasterSigner = useFarcasterSigner({
 *     // ...
 *   });
 *   const frameApp = useFrameAppInWebView({
 *    provider,
 *    farcasterSigner,
 *    // frame returned by useFrame() hook
 *    frame: frameState.frame,
 *    // ... handlers for frame app actions
 *  });
 *
 *  if (frameApp.status !== 'success') {
 *     // render loading or error
 *    return null;
 *  }
 *
 *  return <WebView {...frameApp.webViewProps} />;
 * }
 * ```
 */
export function useFrameAppInWebView(
  options: UseFrameAppOptions
): UseFrameAppInWebViewReturn {
  const providerRef = useFreshRef(options.provider);
  const webViewRef = useRef<WebView | null>(null);
  const debugRef = useFreshRef(options.debug ?? false);
  const frameApp = useFrameApp(options);
  const endpointRef = useRef<WebViewEndpoint | null>(null);
  const emitterRef = useRef<HostEndpointEmitter | null>(null);
  const logDebug = useDebugLog(
    "@frames.js/render/frame-app/web-view",
    debugRef.current
  );
  const emitter = useMemo<HostEndpointEmitter>(() => {
    return {
      emit(...args) {
        if (emitterRef.current) {
          emitterRef.current.emit(...args);
        } else {
          logDebug(
            "endpoint not available, probably not initialized yet, skipping emit",
            args
          );
        }
      },
      emitEthProvider(...args) {
        if (emitterRef.current) {
          emitterRef.current.emitEthProvider(
            ...(args as Parameters<typeof emitterRef.current.emitEthProvider>)
          );
        } else {
          logDebug(
            "endpoint not available, probably not initialized yet, skipping emitEthProvider",
            args
          );
        }
      },
    };
  }, [logDebug]);

  const onMessage = useCallback<NonNullable<WebViewProps["onMessage"]>>(
    (event) => {
      logDebug("webView.onMessage() called", event);

      endpointRef.current?.onMessage(event);
    },
    [logDebug]
  );

  const webViewFrameApp = useMemo<UseFrameAppInWebViewReturn>(() => {
    switch (frameApp.status) {
      case "error":
      case "pending":
        return frameApp;
      case "success": {
        const frame = frameApp.frame.frame;
        const frameUrl = frame.button?.action?.url;

        if (!frameUrl) {
          return {
            status: "error",
            error: new Error(
              "Frame URL is not provided, please check button.action.url"
            ),
          };
        }

        return {
          ...frameApp,
          emitter,
          webViewProps: {
            source: { uri: frameUrl },
            onMessage,
            ref: webViewRef,
          },
        };
      }
      default:
        assertNever(frameApp);
    }
  }, [frameApp, onMessage, emitter]);

  useEffect(() => {
    if (webViewFrameApp.status !== "success") {
      return;
    }

    const webView = webViewRef.current;

    if (!webView) {
      logDebug("WebView ref not available");
      return;
    }

    const endpoint = createWebViewRpcEndpoint(webViewRef);
    const cleanup = exposeToEndpoint({
      endpoint,
      frameOrigin: "ReactNativeWebView",
      sdk: webViewFrameApp.sdk(endpoint),
      debug: debugRef.current,
      ethProvider: providerRef.current,
    });

    endpointRef.current = endpoint;
    emitterRef.current = webViewFrameApp.getEmitter(endpoint);

    logDebug("WebView endpoint created");

    return () => {
      logDebug("WebView unmounted, cleaning up");
      webViewRef.current = null;
      endpointRef.current = null;
      emitterRef.current = null;
      cleanup();
    };
  }, [webViewFrameApp, logDebug, debugRef, providerRef]);

  return webViewFrameApp;
}
