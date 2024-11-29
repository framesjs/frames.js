import type { FrameV2 } from "frames.js";
import { expose, windowEndpoint, type Endpoint } from "comlink";
import { useCallback, useMemo } from "react";
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

type RegisterEndpointFunction = (endpoint: Endpoint) => void;

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

  // @todo solve expose isolation per endpoint because it's not possible to clean up the exposed API at the moment unless the target releases its proxy
  // @see https://github.com/GoogleChromeLabs/comlink/issues/674
  // Perhaps this hook should be global and only once per whole app for now?
  const registerEndpoint = useCallback<RegisterEndpointFunction>(
    (endpoint) => {
      const signer = farcasterSignerRef.current.signer;

      if (signer?.status !== "approved") {
        onSignerNotApprovedRef.current();
        return;
      }

      expose(
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

export function useFrameAppInIframe(
  options: UseFrameAppOptions
): UseFrameAppInIframeReturn {
  const frameApp = useFrameApp(options);

  return useMemo(() => {
    return {
      onLoad(event) {
        if (!event.currentTarget.contentWindow) {
          return;
        }

        frameApp.registerEndpoint(
          windowEndpoint(event.currentTarget.contentWindow)
        );
      },
    };
  }, [frameApp]);
}
