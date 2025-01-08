import type { ParseFramesV2ResultWithFrameworkDetails } from "frames.js/frame-parsers";
import type { FrameHost, HostEndpoint, Context } from "@farcaster/frame-host";
import { AddFrame } from "@farcaster/frame-host";
import { useMemo } from "react";
import { useFreshRef } from "./hooks/use-fresh-ref";
import type {
  EthProvider,
  FrameClientConfig,
  HostEndpointEmitter,
  OnAddFrameRequestedFunction,
  OnEIP6963RequestProviderRequestedFunction,
  OnPrimaryButtonSetFunction,
  OnSendTransactionRequestFunction,
  OnSignInFunction,
  OnSignMessageRequestFunction,
  OnSignTypedDataRequestFunction,
  OnViewProfileFunction,
  ResolveClientFunction,
} from "./frame-app/types";
import { assertNever } from "./assert-never";
import { useFetchFrameApp } from "./frame-app/use-fetch-frame-app";
import { useResolveClient } from "./frame-app/use-resolve-client";
import { useDebugLog } from "./hooks/use-debug-log";

const defaultFrameRequestCache = new Set<string>();

const defaultOnAddFrameRequested: OnAddFrameRequestedFunction =
  function defaultOnAddFrameRequested() {
    // eslint-disable-next-line no-console -- provide feedback to the developer
    console.error(
      "@frames.js/render/use-frame-app",
      "onAddFrameRequested not implemented"
    );

    return Promise.reject(new Error("onAddFrameRequested not implemented"));
  };

const defaultOnSendTransactionRequest: OnSendTransactionRequestFunction =
  () => {
    // eslint-disable-next-line no-console -- provide feedback to the developer
    console.warn(
      "@frames.js/render/use-frame-app",
      "onSendTransactionRequest not implemented"
    );

    return Promise.resolve(true);
  };

const defaultOnSignMessageRequest: OnSignMessageRequestFunction = () => {
  // eslint-disable-next-line no-console -- provide feedback to the developer
  console.warn(
    "@frames.js/render/use-frame-app",
    "onSignMessageRequest not implemented"
  );

  return Promise.resolve(true);
};

const defaultOnSignTypedDataRequest: OnSignTypedDataRequestFunction = () => {
  // eslint-disable-next-line no-console -- provide feedback to the developer
  console.warn(
    "@frames.js/render/use-frame-app",
    "onSignTypedDataRequest not implemented"
  );

  return Promise.resolve(true);
};

const defaultViewProfile: OnViewProfileFunction = () => {
  // eslint-disable-next-line no-console -- provide feedback to the developer
  console.warn(
    "@frames.js/render/use-frame-app",
    "onViewProfile not implemented"
  );

  return Promise.reject(new Error("onViewProfile not implemented"));
};

const defaultEIP6963RequestProviderRequested: OnEIP6963RequestProviderRequestedFunction =
  () => {
    // eslint-disable-next-line no-console -- provide feedback to the developer
    console.warn(
      "@frames.js/render/use-frame-app",
      "onEIP6963RequestProviderRequested not implemented"
    );
  };

const defaultSignIn: OnSignInFunction = () => {
  // eslint-disable-next-line no-console -- provide feedback to the developer
  console.warn("@frames.js/render/use-frame-app", "onSignIn not implemented");

  return Promise.reject(new Error("onSignIn not implemented"));
};

export type UseFrameAppOptions = {
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
   *
   * This is async function if you need to fetch the client configuration
   * like notification settings, etc.
   *
   * Value should be memoized otherwise it will cause unnecessary re-renders.
   */
  client: FrameClientConfig | ResolveClientFunction;
  /**
   * Information about the context from which the frame was launched.
   *
   * @defaultValue launcher context
   */
  location?: Context.LocationContext;
  /**
   * Information about the user who manipulates with the frame.
   *
   * Value should be memoized otherwise it will cause unnecessary re-renders.
   */
  user: Context.UserContext;
  /**
   * Either:
   *
   * - frame parse result obtained from useFrame() hook
   * - frame url as string or URL object
   *
   * If value changes it resets the internal state and refetches the frame if the new value is url.
   */
  source: ParseFramesV2ResultWithFrameworkDetails | string | URL;
  /**
   * Custom fetch compatible function used to make requests.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
   */
  fetchFn?: typeof fetch;
  /**
   * Frame proxyUrl used to fetch the frame parse result.
   */
  proxyUrl: string;
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
   * Called when app calls `signIn` method.
   */
  onSignIn?: OnSignInFunction;
  /**
   * Called when app calls `viewProfile` method.
   */
  onViewProfile?: OnViewProfileFunction;
  /**
   * Called when app calls `eip6963RequestProvider` method.
   *
   * It will announce the provider to the frame app once this function returns the info
   */
  onEIP6963RequestProviderRequested?: OnEIP6963RequestProviderRequestedFunction;
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

export type UseFrameAppReturn =
  | {
      frame: ParseFramesV2ResultWithFrameworkDetails;
      client: FrameClientConfig;
      status: "success";
      /**
       * Creates sdk that must be exposed to frame app endpoint
       */
      sdk: (endpoint: HostEndpoint) => Omit<FrameHost, "ethProviderRequestV2">;
      /**
       * Gets emitter object that can be used to emit events to the frame app.
       */
      getEmitter: (endpoint: HostEndpoint) => HostEndpointEmitter;
    }
  | {
      status: "pending";
    }
  | {
      error: Error;
      status: "error";
    };

const defaultLocation: Context.LauncherLocationContext = {
  type: "launcher",
};

/**
 * This hook is used to handle frames v2 apps.
 */
export function useFrameApp({
  provider,
  client,
  location = defaultLocation,
  user,
  source,
  fetchFn,
  proxyUrl,
  onClose,
  onOpenUrl,
  onPrimaryButtonSet,
  onReady,
  debug = false,
  addFrameRequestsCache = defaultFrameRequestCache,
  onAddFrameRequested = defaultOnAddFrameRequested,
  onSendTransactionRequest = defaultOnSendTransactionRequest,
  onSignMessageRequest = defaultOnSignMessageRequest,
  onSignTypedDataRequest = defaultOnSignTypedDataRequest,
  onViewProfile = defaultViewProfile,
  onEIP6963RequestProviderRequested = defaultEIP6963RequestProviderRequested,
  onSignIn = defaultSignIn,
}: UseFrameAppOptions): UseFrameAppReturn {
  const providerRef = useFreshRef(provider);
  const debugRef = useFreshRef(debug);
  const locationRef = useFreshRef(location);
  const readyRef = useFreshRef(onReady);
  const closeRef = useFreshRef(onClose);
  const onOpenUrlRef = useFreshRef(onOpenUrl);
  const onPrimaryButtonSetRef = useFreshRef(onPrimaryButtonSet);
  const onViewProfileRef = useFreshRef(onViewProfile);
  const onEIP6963RequestProviderRequestedRef = useFreshRef(
    onEIP6963RequestProviderRequested
  );
  const onSignInRef = useFreshRef(onSignIn);
  const onAddFrameRequestedRef = useFreshRef(onAddFrameRequested);
  const addFrameRequestsCacheRef = useFreshRef(addFrameRequestsCache);
  const clientResolutionState = useResolveClient({ client });
  const frameResolutionState = useFetchFrameApp({
    source,
    fetchFn,
    proxyUrl,
  });
  const logDebug = useDebugLog(
    "@frames.js/render/use-frame-app",
    debugRef.current
  );

  providerRef.current.setEventHandlers({
    onSendTransactionRequest,
    onSignMessageRequest,
    onSignTypedDataRequest,
  });

  return useMemo<UseFrameAppReturn>(() => {
    if (clientResolutionState.status === "pending") {
      return {
        status: "pending",
      };
    }

    if (clientResolutionState.status === "error") {
      return {
        status: "error",
        error: clientResolutionState.error,
      };
    }

    const resolvedClient = clientResolutionState.client;

    switch (frameResolutionState.status) {
      case "success": {
        const frame = frameResolutionState.frame;

        return {
          getEmitter: (endpoint) => ({
            emit: endpoint.emit,
            emitEthProvider: endpoint.emitEthProvider,
          }),
          sdk: (endpoint) => ({
            async addFrame() {
              logDebug("sdk.addFrame() called");

              if (
                frame.status !== "success" ||
                frame.manifest?.status !== "success"
              ) {
                logDebug("Invalid frame domain manifest");

                endpoint.emit({
                  event: "frame_add_rejected",
                  reason: "invalid_domain_manifest",
                });

                throw new AddFrame.InvalidDomainManifest();
              }

              if (
                addFrameRequestsCacheRef.current.has(
                  frame.frame.button.action.url
                )
              ) {
                logDebug("Frame already requested to be added.");

                endpoint.emit({
                  event: "frame_add_rejected",
                  reason: "rejected_by_user",
                });

                throw new AddFrame.RejectedByUser();
              }

              const result = await onAddFrameRequestedRef.current(frame);

              logDebug("onAddFrameRequested() called", result);

              addFrameRequestsCacheRef.current.add(
                frame.frame.button.action.url
              );

              if (!result) {
                logDebug("Frame add request rejected by user");

                endpoint.emit({
                  event: "frame_add_rejected",
                  reason: "rejected_by_user",
                });

                throw new AddFrame.RejectedByUser();
              }

              endpoint.emit({
                event: "frame_added",
                notificationDetails: result.notificationDetails,
              });

              return result;
            },
            close() {
              logDebug("sdk.close() called");
              closeRef.current?.();
            },
            context: {
              client: resolvedClient,
              location: locationRef.current,
              user,
            },
            async ethProviderRequest(parameters) {
              // @ts-expect-error -- type mismatch
              return providerRef.current.request(parameters);
            },
            eip6963RequestProvider() {
              onEIP6963RequestProviderRequestedRef.current({ endpoint });
            },
            openUrl(url) {
              logDebug("sdk.openUrl() called", url);

              onOpenUrlRef.current?.(url);
            },
            ready(options) {
              logDebug("sdk.ready() called");

              readyRef.current?.(options);
            },
            setPrimaryButton(options) {
              logDebug("sdk.setPrimaryButton() called", options);

              onPrimaryButtonSetRef.current?.(options, () => {
                logDebug('"primaryButtonClicked" called');

                endpoint.emit({
                  event: "primary_button_clicked",
                });
              });
            },
            signIn(options) {
              return onSignInRef.current({
                ...options,
                frame,
              });
            },
            viewProfile(options) {
              return onViewProfileRef.current(options);
            },
          }),
          status: "success",
          frame: frameResolutionState.frame,
          client: clientResolutionState.client,
        };
      }
      case "error": {
        return {
          status: "error",
          error: frameResolutionState.error,
        };
      }
      case "pending": {
        return {
          status: "pending",
        };
      }
      default:
        assertNever(frameResolutionState);
    }
  }, [
    clientResolutionState,
    frameResolutionState,
    locationRef,
    logDebug,
    addFrameRequestsCacheRef,
    onAddFrameRequestedRef,
    closeRef,
    providerRef,
    onOpenUrlRef,
    readyRef,
    onPrimaryButtonSetRef,
    onViewProfileRef,
    onEIP6963RequestProviderRequestedRef,
    onSignInRef,
    user,
  ]);
}
