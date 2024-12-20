import {
  exposeToEndpoint,
  createIframeEndpoint,
  type HostEndpoint,
} from "@farcaster/frame-host";
import { useEffect, useMemo, useRef } from "react";
import type { UseFrameAppOptions, UseFrameAppReturn } from "../use-frame-app";
import { useFrameApp } from "../use-frame-app";
import { useFreshRef } from "../hooks/use-fresh-ref";
import { useDebugLog } from "../hooks/use-debug-log";
import { assertNever } from "../assert-never";
import type { HostEndpointEmitter } from "./types";

type UseFrameAppReturnSuccess = Extract<
  UseFrameAppReturn,
  { status: "success" }
>;

export type UseFrameAppInIframeReturn =
  | Exclude<UseFrameAppReturn, { status: "success" }>
  | ({
      iframeProps: {
        src: string | undefined;
        ref: React.MutableRefObject<HTMLIFrameElement | null>;
      };
      emitter: HostEndpointEmitter;
    } & Omit<UseFrameAppReturnSuccess, "emitter">);

/**
 * Handles frame app in iframe.
 *
 * On unmount it automatically unregisters the endpoint listener.
 *
 * @example
 * ```
 * import { useFrameAppInIframe } from '@frames.js/render/frame-app/iframe';
 * import { useWagmiProvider } from '@frames.js/render/frame-app/provider/wagmi';
 * import { useFarcasterSigner } from '@frames.js/render/identity/farcaster';
 *
 * function MyAppDialog() {
 *  const provider = useWagmiProvider();
 *  const farcasterSigner = useFarcasterSigner({
 *    // ...
 *  });
 *  const frameApp = useFrameAppInIframe({
 *    provider,
 *    farcasterSigner,
 *    // frame returned by useFrame() hook
 *    frame: frameState.frame,
 *    // ... handlers for frame app actions
 *  });
 *
 *  if (frameApp.status !== 'success') {
 *   // render loading or error
 *   return null;
 *  }
 *
 *  return <iframe {...frameApp.iframeProps} />;
 * }
 * ```
 */
export function useFrameAppInIframe(
  options: UseFrameAppOptions
): UseFrameAppInIframeReturn {
  const providerRef = useFreshRef(options.provider);
  const debugRef = useFreshRef(options.debug ?? false);
  const frameApp = useFrameApp(options);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const endpointRef = useRef<HostEndpoint | null>(null);
  const emitterRef = useRef<HostEndpointEmitter | null>(null);
  const logDebug = useDebugLog(
    "@frames.js/render/frame-app/iframe",
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

  const iframeFrameApp = useMemo<UseFrameAppInIframeReturn>(() => {
    switch (frameApp.status) {
      case "error":
      case "pending":
        return frameApp;
      case "success": {
        const frameUrl = frameApp.frame.frame.button?.action?.url;

        if (!frameUrl) {
          return {
            status: "error",
            error: new Error(
              "Frame URL is not provided, please check button.action.url"
            ),
          };
        }

        const frameOrigin = new URL(frameUrl).origin;

        return {
          ...frameApp,
          status: "success",
          frameOrigin,
          iframeProps: {
            src: frameUrl,
            ref: iframeRef,
          },
          emitter,
        };
      }
      default:
        assertNever(frameApp);
    }
  }, [frameApp, emitter]);

  useEffect(() => {
    if (iframeFrameApp.status !== "success") {
      return;
    }

    const iframe = iframeRef.current;

    if (!iframe) {
      logDebug("iframe ref not available");
      return;
    }

    const frameUrl = iframeFrameApp.iframeProps.src;
    let frameOrigin = "";

    if (!frameUrl) {
      logDebug("frame URL not available, using empty string");
    } else {
      frameOrigin = new URL(frameUrl).origin;
    }

    const endpoint = createIframeEndpoint({
      iframe,
      targetOrigin: frameOrigin,
      debug: debugRef.current,
    });
    const cleanup = exposeToEndpoint({
      endpoint,
      frameOrigin,
      sdk: iframeFrameApp.sdk(endpoint),
      debug: debugRef.current,
      ethProvider: providerRef.current,
    });

    endpointRef.current = endpoint;
    emitterRef.current = iframeFrameApp.getEmitter(endpoint);

    logDebug("iframe endpoint created");

    return () => {
      logDebug("iframe unmounted, cleaning up");
      endpointRef.current = null;
      iframeRef.current = null;
      emitterRef.current = null;
      cleanup();
    };
  }, [iframeFrameApp, logDebug, debugRef, providerRef]);

  return iframeFrameApp;
}
