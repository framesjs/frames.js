/* eslint-disable @typescript-eslint/require-await -- we expect async functions */
/* eslint-disable no-console -- provide feedback */
/* eslint-disable no-alert -- provide feedback */
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Frame,
  FrameButton,
  FrameButtonLink,
  FrameButtonPost,
  FrameButtonTx,
  TransactionTargetResponse,
} from "frames.js";
import type {
  OnMintArgs,
  OnTransactionArgs,
  OnSignatureArgs,
  CastActionButtonPressFunction,
  ComposerActionButtonPressFunction,
} from "./types";
import type { UseFrameOptions, UseFrameReturnValue } from "./unstable-types";
import { useFrameState } from "./unstable-use-frame-state";
import { useFetchFrame } from "./unstable-use-fetch-frame";
import { useFreshRef } from "./hooks/use-fresh-ref";

function onMintFallback({ target }: OnMintArgs): void {
  console.log("Please provide your own onMint function to useFrame() hook.");

  const message = `Mint requested: ${target}`;

  if (typeof window !== "undefined") {
    window.alert(message);
  } else {
    console.log(message);
  }
}

function onConnectWalletFallback(): never {
  throw new Error(
    "Please implement this function in order to use transactions"
  );
}

async function onTransactionFallback({
  transactionData,
}: OnTransactionArgs): Promise<null> {
  console.log(
    "Please provide your own onTransaction function to useFrame() hook."
  );

  const message = `Requesting a transaction on chain with ID ${
    transactionData.chainId
  } with the following params: ${JSON.stringify(
    transactionData.params,
    null,
    2
  )}`;

  if (typeof window !== "undefined") {
    window.alert(message);
  } else {
    console.log(message);
  }

  return null;
}

async function onSignatureFallback({
  signatureData,
}: OnSignatureArgs): Promise<null> {
  console.log(
    "Please provide your own onSignature function to useFrame() hook."
  );

  const message = `Requesting a signature on chain with ID ${
    signatureData.chainId
  } with the following params: ${JSON.stringify(
    signatureData.params,
    null,
    2
  )}`;

  if (typeof window !== "undefined") {
    window.alert(message);
  } else {
    console.log(message);
  }

  return null;
}

function handleRedirectFallback(location: URL): void {
  console.log(
    "Please provide your own onRedirect function to useFetchFrame() hook."
  );

  const message = `You are about to be redirected to ${location.toString()}`;

  if (typeof window !== "undefined") {
    if (window.confirm(message)) {
      window.open(location, "_blank")?.focus();
    }
  } else {
    console.log(message);
  }
}

function handleLinkButtonClickFallback(button: FrameButtonLink): void {
  console.log(
    "Please provide your own onLinkButtonClick function to useFrame() hook."
  );

  if (typeof window !== "undefined") {
    if (window.confirm(`You are about to be redirected to ${button.target}`)) {
      parent.window.open(button.target, "_blank");
    }
  } else {
    console.log(`Link button with target ${button.target} clicked.`);
  }
}

function defaultComposerFormActionHandler(): Promise<never> {
  throw new Error('Please implement your own "onComposerFormAction" handler');
}

/**
 * Validates a link button target to ensure it is a valid HTTP or HTTPS URL.
 * @param target - The target URL to validate.
 * @returns True if the target is a valid HTTP or HTTPS URL, otherwise throws an error.
 */
function validateLinkButtonTarget(target: string): boolean {
  // check the URL is valid
  const locationUrl = new URL(target);

  // Reject non-http(s) URLs
  if (locationUrl.protocol !== "http:" && locationUrl.protocol !== "https:") {
    throw new Error(
      `Redirect location ${locationUrl.toString()} is not a valid HTTP or HTTPS URL.`
    );
  }

  return true;
}

export type { UseFrameReturnValue, UseFrameOptions };

export function useFrame({
  homeframeUrl,
  onMint = onMintFallback,
  onTransaction = onTransactionFallback,
  transactionDataSuffix,
  onConnectWallet = onConnectWalletFallback,
  onSignature = onSignatureFallback,
  connectedAddress,
  frame,
  /** Ex: /frames */
  frameActionProxy,
  /** Ex: /frames */
  frameGetProxy,
  extraButtonRequestPayload,
  resolveSpecification,
  resolveCastOrComposerActionSigner,
  onError,
  onLinkButtonClick = handleLinkButtonClickFallback,
  onRedirect = handleRedirectFallback,
  fetchFn = (...args) => fetch(...args),
  onComposerFormAction = defaultComposerFormActionHandler,
  onTransactionDataError,
  onTransactionDataStart,
  onTransactionDataSuccess,
  onTransactionError,
  onTransactionProcessingError,
  onTransactionProcessingStart,
  onTransactionProcessingSuccess,
  onTransactionStart,
  onTransactionSuccess,
}: UseFrameOptions): UseFrameReturnValue {
  const resolveCastOrComposerActionSignerRef = useFreshRef(
    resolveCastOrComposerActionSigner
  );
  const [inputText, setInputText] = useState("");
  const inputTextRef = useFreshRef(inputText);
  const [frameState, frameStateAPI] = useFrameState({
    resolveSpecification,
    initialFrameUrl: homeframeUrl,
    initialParseResult: frame,
  });
  const frameStateRef = useFreshRef(frameState);

  const {
    clear: clearFrameState,
    dispatch: dispatchFrameState,
    reset: resetFrameState,
  } = frameStateAPI;

  const fetchFrame = useFetchFrame({
    frameState,
    frameStateAPI,
    frameActionProxy,
    frameGetProxy,
    onTransaction,
    transactionDataSuffix,
    onSignature,
    extraButtonRequestPayload,
    onError,
    fetchFn,
    onRedirect,
    onComposerFormAction,
    onTransactionDataError,
    onTransactionDataStart,
    onTransactionDataSuccess,
    onTransactionError,
    onTransactionProcessingError,
    onTransactionProcessingStart,
    onTransactionProcessingSuccess,
    onTransactionStart,
    onTransactionSuccess,
  });

  const fetchFrameRef = useFreshRef(fetchFrame);
  const onErrorRef = useFreshRef(onError);

  useEffect(() => {
    if (!homeframeUrl) {
      // if we don't have an url we don't want to show anything
      clearFrameState();

      return;
    }

    if (!frame) {
      fetchFrameRef
        .current(
          {
            url: homeframeUrl,
            method: "GET",
          },
          // tell the fetchFrame function to clear the stack because this is called only on initial render
          // and there could potentially be a pending object returned from SSR
          true
        )
        .catch((e) => {
          console.error(e);
        });
    } else {
      resetFrameState({
        homeframeUrl,
        parseResult: frame,
      });
    }
  }, [frame, homeframeUrl, clearFrameState, fetchFrameRef, resetFrameState]);

  const onPostButton = useCallback(
    async function onPostButton({
      currentFrame,
      buttonIndex,
      postInputText,
      frameButton,
      target,
      state,
      fetchFrameOverride,
    }: {
      currentFrame: Frame;
      frameButton: FrameButtonPost;
      buttonIndex: number;
      postInputText: string | undefined;
      state?: string;
      target: string;
      fetchFrameOverride?: typeof fetchFrame;
    }): Promise<void> {
      const currentState = frameStateRef.current;

      if (currentState.type === "not-initialized") {
        const error = new Error(
          "Cannot perform post/post_redirect without a frame"
        );

        console.error(`@frames.js/render: ${error.message}`);
        onErrorRef.current?.(error);

        return;
      }

      if (!currentState.signerState.hasSigner) {
        const error = new Error("Missing signer");

        console.error(`@frames.js/render: ${error.message}`);
        onErrorRef.current?.(error);

        return;
      }

      const _fetchFrame = fetchFrameOverride ?? fetchFrameRef.current;

      await _fetchFrame({
        frameButton,
        isDangerousSkipSigning: false,
        method: "POST",
        signerStateActionContext: {
          inputText: postInputText,
          signer: currentState.signerState.signer,
          frameContext: currentState.frameContext,
          url: currentState.homeframeUrl,
          target,
          frameButton,
          buttonIndex,
          state,
        },
        sourceFrame: currentFrame,
      });
    },
    [fetchFrameRef, frameStateRef, onErrorRef]
  );

  const onConnectWalletRef = useFreshRef(onConnectWallet);
  const connectedAddressRef = useFreshRef(connectedAddress);

  const onTransactionButton = useCallback(
    async function onTransactionButton({
      currentFrame,
      buttonIndex,
      postInputText,
      frameButton,
    }: {
      currentFrame: Frame;
      frameButton: FrameButtonTx;
      buttonIndex: number;
      postInputText: string | undefined;
    }): Promise<TransactionTargetResponse | undefined> {
      const state = frameStateRef.current;

      if (state.type === "not-initialized") {
        const error = new Error("Cannot perform transaction without a frame");

        console.error(`@frames.js/render: ${error.message}`);
        onErrorRef.current?.(error);

        return;
      }

      // Send post request to get calldata
      if (!state.signerState.hasSigner) {
        const error = new Error("Missing signer");

        console.error(`@frames.js/render: ${error.message}`);
        onErrorRef.current?.(error);

        return;
      }

      if (!connectedAddressRef.current) {
        try {
          onConnectWalletRef.current();
        } catch (e) {
          onErrorRef.current?.(e instanceof Error ? e : new Error(String(e)));
          console.error(`@frames.js/render: ${String(e)}`);
        }

        return;
      }

      await fetchFrameRef.current({
        frameButton,
        isDangerousSkipSigning: false,
        method: "POST",
        signerStateActionContext: {
          type: "tx-data",
          inputText: postInputText,
          signer: state.signerState.signer,
          frameContext: state.frameContext,
          address: connectedAddressRef.current,
          url: state.homeframeUrl,
          target: frameButton.target,
          frameButton,
          buttonIndex,
          state: currentFrame.state,
        },
        sourceFrame: currentFrame,
      });
    },
    [
      frameStateRef,
      connectedAddressRef,
      fetchFrameRef,
      onErrorRef,
      onConnectWalletRef,
    ]
  );

  const onButtonPress = useCallback(
    async function onButtonPress(
      currentFrame: Frame,
      frameButton: FrameButton,
      index: number,
      fetchFrameOverride?: typeof fetchFrame
    ): Promise<void> {
      switch (frameButton.action) {
        case "link": {
          try {
            validateLinkButtonTarget(frameButton.target);
          } catch (error) {
            if (error instanceof Error) {
              onErrorRef.current?.(error);
            }
            return;
          }

          onLinkButtonClick(frameButton);
          break;
        }
        case "mint": {
          onMint({
            frameButton,
            target: frameButton.target,
            frame: currentFrame,
          });
          break;
        }
        case "tx": {
          await onTransactionButton({
            frameButton,
            buttonIndex: index + 1,
            postInputText:
              currentFrame.inputText !== undefined
                ? inputTextRef.current
                : undefined,
            currentFrame,
          });
          break;
        }
        case "post":
        case "post_redirect": {
          try {
            const target =
              frameButton.target ||
              frameButton.post_url ||
              currentFrame.postUrl ||
              homeframeUrl;

            if (!target) {
              onErrorRef.current?.(new Error(`Missing target`));
              return;
            }

            try {
              validateLinkButtonTarget(target);
            } catch (error) {
              if (error instanceof Error) {
                onErrorRef.current?.(error);
              }
              return;
            }

            await onPostButton({
              currentFrame,
              frameButton,
              /** https://docs.farcaster.xyz/reference/frames/spec#handling-clicks
    
            POST the packet to fc:frame:button:$idx:action:target if present
            POST the packet to fc:frame:post_url if target was not present.
            POST the packet to or the frame's embed URL if neither target nor action were present.
            */
              target,
              buttonIndex: index + 1,
              postInputText:
                currentFrame.inputText !== undefined
                  ? inputTextRef.current
                  : undefined,
              state: currentFrame.state,
              fetchFrameOverride,
            });
            setInputText("");
          } catch (err) {
            if (err instanceof Error) {
              onErrorRef.current?.(err);
            }

            console.error(err);
          }
          break;
        }
        default:
          throw new Error("Unrecognized frame button action");
      }
    },
    [
      homeframeUrl,
      inputTextRef,
      onErrorRef,
      onLinkButtonClick,
      onMint,
      onPostButton,
      onTransactionButton,
    ]
  );

  const onCastActionButtonPress: CastActionButtonPressFunction = useCallback(
    async function onActionButtonPress(arg) {
      const { signerState, frameContext } =
        resolveCastOrComposerActionSignerRef.current({
          action: {
            type: "cast",
            action: arg.castAction,
          },
        });

      if (!signerState.hasSigner) {
        await signerState.onSignerlessFramePress();
        // don't continue, let the app handle
        return;
      }

      return fetchFrame(
        {
          method: "CAST_ACTION",
          signerState,
          action: arg.castAction,
          isDangerousSkipSigning: false,
          signerStateActionContext: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- we trust the signerState
            signer: signerState.signer,
            frameContext,
            url: arg.castAction.url,
            target: arg.castAction.url,
            buttonIndex: 1,
          },
        },
        arg.clearStack
      );
    },
    [fetchFrame, resolveCastOrComposerActionSignerRef]
  );

  const onComposerActionButtonPress: ComposerActionButtonPressFunction =
    useCallback(
      async function onActionButtonPress(arg) {
        const { signerState, frameContext } =
          resolveCastOrComposerActionSignerRef.current({
            action: {
              type: "compose",
              action: arg.castAction,
              composerActionState: arg.composerActionState,
            },
          });

        if (!signerState.hasSigner) {
          await signerState.onSignerlessFramePress();
          // don't continue, let the app handle
          return;
        }

        return fetchFrame(
          {
            method: "COMPOSER_ACTION",
            signerState,
            action: arg.castAction,
            isDangerousSkipSigning: false,
            composerActionState: arg.composerActionState,
            signerStateActionContext: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- we trust the signerState
              signer: signerState.signer,
              frameContext,
              url: arg.castAction.url,
              target: arg.castAction.url,
              buttonIndex: 1,
            },
          },
          arg.clearStack
        );
      },
      [fetchFrame, resolveCastOrComposerActionSignerRef]
    );

  const { stack } = frameState;
  const { signerState, specification } =
    frameState.type === "initialized"
      ? frameState
      : { signerState: undefined, specification: undefined };

  return useMemo(() => {
    return {
      signerState,
      specification,
      inputText,
      setInputText,
      clearFrameStack: clearFrameState,
      dispatchFrameStack: dispatchFrameState,
      reset: resetFrameState,
      onButtonPress,
      fetchFrame,
      homeframeUrl,
      framesStack: stack,
      currentFrameStackItem: stack[0],
      onCastActionButtonPress,
      onComposerActionButtonPress,
    };
  }, [
    signerState,
    specification,
    inputText,
    clearFrameState,
    dispatchFrameState,
    onButtonPress,
    resetFrameState,
    fetchFrame,
    homeframeUrl,
    stack,
    onCastActionButtonPress,
    onComposerActionButtonPress,
  ]);
}
