import type { FrameV2 } from "frames.js";
import {
  expose,
  windowEndpoint,
  type Endpoint,
} from "@michalkvasnicak/comlink";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { FrameHost, SetPrimaryButton } from "@farcaster/frame-sdk";
import type { UseWalletClientReturnType } from "wagmi";
import { useFreshRef } from "./hooks/use-fresh-ref";
import type { FarcasterSignerState } from "./farcaster";
import type { FarcasterSigner } from "./identity/farcaster";

function defaultOnSignerNotApproved(): void {
  // eslint-disable-next-line no-console -- provide feedback to the developer
  console.error(
    "@frames.js/render/unstable-use-frame-app",
    "Signer not approved"
  );
}

export type FramePrimaryButton = Parameters<SetPrimaryButton>[0];

type UseFrameAppOptions = {
  /**
   * Wallet client from wagmi's useWalletClient() hook
   */
  walletClient: UseWalletClientReturnType;
  /**
   * Obtained from useFrame() onLaunchFrameButtonPressed() callback
   */
  frame: FrameV2;
  /**
   * Farcaster signer state. Must be already approved otherwise it will call onError
   * and getting context in app will be rejected
   */
  farcasterSigner: FarcasterSignerState<FarcasterSigner | null>;
  /**
   * Called when app calls `ready` method.
   */
  onReady?: () => void;
  /**
   * Called when app calls `close` method.
   */
  onClose?: () => void;
  /**
   * Called when app calls `openUrl` method.
   */
  onOpenUrl?: (url: string) => void;
  /**
   * Called when provided signer is not approved.
   */
  onSignerNotApproved?: () => void;
  /**
   * Called when app calls `setPrimaryButton` method.
   */
  onPrimaryButtonSet?: SetPrimaryButton;
};

type UnregisterEndpointFunction = () => void;

type RegisterEndpointFunction = (
  endpoint: Endpoint
) => UnregisterEndpointFunction;

type UseFrameAppReturn = {
  /**
   * Necessary to call with target endpoint to expose API to the frame.
   */
  registerEndpoint: RegisterEndpointFunction;
};

/**
 * This hook is used to handle frames v2 apps.
 */
export function useFrameApp({
  walletClient: client,
  farcasterSigner,
  frame,
  onClose,
  onOpenUrl,
  onPrimaryButtonSet,
  onReady,
  onSignerNotApproved = defaultOnSignerNotApproved,
}: UseFrameAppOptions): UseFrameAppReturn {
  const clientRef = useFreshRef(client);
  const readyRef = useFreshRef(onReady);
  const closeRef = useFreshRef(onClose);
  const onOpenUrlRef = useFreshRef(onOpenUrl);
  const onSignerNotApprovedRef = useFreshRef(onSignerNotApproved);
  const onPrimaryButtonSetRef = useFreshRef(onPrimaryButtonSet);
  const farcasterSignerRef = useFreshRef(farcasterSigner);
  /**
   * Used to unregister message listener of previously exposed endpoint.
   */
  const unregisterPreviouslyExposedEndpointListenerRef =
    useRef<UnregisterEndpointFunction>(() => {
      // no-op
    });

  const registerEndpoint = useCallback<RegisterEndpointFunction>(
    (endpoint) => {
      unregisterPreviouslyExposedEndpointListenerRef.current();

      const signer = farcasterSignerRef.current.signer;

      if (signer?.status !== "approved") {
        onSignerNotApprovedRef.current();

        return () => {
          // no-op
        };
      }

      unregisterPreviouslyExposedEndpointListenerRef.current = expose(
        {
          close() {
            const handler = closeRef.current;

            if (!handler) {
              // eslint-disable-next-line no-console -- provide feedback to the developer
              console.warn(
                '@frames.js/render/unstable-use-frame-app: "close" called but no handler provided'
              );
            } else {
              handler();
            }
          },
          get context() {
            return { user: { fid: signer.fid } };
          },
          openUrl(url) {
            const handler = onOpenUrlRef.current;

            if (!handler) {
              // eslint-disable-next-line no-console -- provide feedback to the developer
              console.warn(
                '@frames.js/render/unstable-use-frame-app: "openUrl" called but no handler provided'
              );
            } else {
              handler(url);
            }
          },
          ready() {
            const handler = readyRef.current;

            if (!handler) {
              // eslint-disable-next-line no-console -- provide feedback to the developer
              console.warn(
                '@frames.js/render/unstable-use-frame-app: "ready" called but no handler provided'
              );
            } else {
              handler();
            }
          },
          setPrimaryButton(options) {
            const handler = onPrimaryButtonSetRef.current;

            if (!handler) {
              // eslint-disable-next-line no-console -- provide feedback to the developer
              console.warn(
                '@frames.js/render/unstable-use-frame-app: "setPrimaryButton" called but no handler provided'
              );
            } else {
              handler(options);
            }
          },
          // @ts-expect-error -- types are mismatched
          async ethProviderRequest(...args) {
            // @ts-expect-error -- types are mismatched
            return clientRef.current.data?.request(...args);
          },
        } satisfies FrameHost,
        endpoint,
        [new URL(frame.button.action.url).origin]
      );

      return unregisterPreviouslyExposedEndpointListenerRef.current;
    },
    [
      clientRef,
      closeRef,
      farcasterSignerRef,
      frame.button.action.url,
      onOpenUrlRef,
      onPrimaryButtonSetRef,
      onSignerNotApprovedRef,
      readyRef,
    ]
  );

  return useMemo(() => {
    return { registerEndpoint };
  }, [registerEndpoint]);
}

type UseFrameAppInIframeReturn = {
  onLoad: (event: React.SyntheticEvent<HTMLIFrameElement>) => void;
};

/**
 * Handles frame app in iframe.
 *
 * On unmount it automatically unregisters the endpoint listener.
 *
 * @example
 * ```
 * import { useFrameAppInIframe } from '@frames.js/render/unstable-use-frame-app';
 * import { useWalletClient } from 'wagmi';
 * import { useFarcasterSigner } from '@frames.js/render/identity/farcaster';
 *
 * function MyAppDialog() {
 *  const walletClient = useWalletClient();
 *  const farcasterSigner = useFarcasterSigner({
 *    // ...
 *  });
 *  const frameApp = useFrameAppInIframe({
 *    walletClient,
 *    farcasterSigner,
 *    // frame returned by useFrame() hook
 *    frame: frameState.frame,
 *    // ... handlers for frame app actions
 *  });
 *
 *  return <iframe ref={frameApp.ref} />;
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

  useEffect(() => {
    return () => {
      unregisterEndpointRef.current();
    };
  }, []);

  return useMemo(() => {
    return {
      onLoad(event) {
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
    };
  }, [frameApp]);
}
