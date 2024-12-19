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

export type UseFrameAppInWebViewReturn =
  | Exclude<UseFrameAppReturn, { status: "success" }>
  | (Extract<UseFrameAppReturn, { status: "success" }> & {
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
 * import { useFrameAppInWebView } from '@frames.js/render/unstable-use-frame-app';
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
  const logDebug = useDebugLog(
    "@frames.js/render/frame-app/web-view",
    debugRef.current
  );

  const onMessage = useCallback<NonNullable<WebViewProps["onMessage"]>>(
    (event) => {
      logDebug("webView.onMessage() called", event);

      endpointRef.current?.onMessage(event);
    },
    [logDebug]
  );

  const result = useMemo<UseFrameAppInWebViewReturn>(() => {
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
  }, [frameApp, onMessage]);

  useEffect(() => {
    if (result.status !== "success") {
      return;
    }

    const webView = webViewRef.current;

    if (!webView) {
      logDebug("WebView ref not available");
      return;
    }

    const endpoint = createWebViewRpcEndpoint(webViewRef);
    endpointRef.current = endpoint;
    const cleanup = exposeToEndpoint({
      endpoint,
      frameOrigin: "ReactNativeWebView",
      sdk: result.sdk(endpoint),
      debug: debugRef.current,
      ethProvider: providerRef.current,
    });

    return () => {
      logDebug("WebView unmounted, cleaning up");
      webViewRef.current = null;
      endpointRef.current = null;
      cleanup();
    };
  }, [result, logDebug, debugRef, providerRef]);

  return result;
}
