/* eslint-disable @typescript-eslint/require-await -- we expect async functions */
/* eslint-disable no-console -- provide feedback */
/* eslint-disable no-alert -- provide feedback */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Frame,
  FrameButton,
  FrameButtonLink,
  FrameButtonPost,
  FrameButtonTx,
  TransactionTargetResponse,
} from "frames.js";
import type {
  FrameState,
  OnMintArgs,
  FrameContext,
  FrameActionBodyPayload,
  UseFrameOptions,
  OnTransactionArgs,
  OnSignatureArgs,
  CastActionButtonPressFunction,
  ComposerActionButtonPressFunction,
} from "./types";
import { unsignedFrameAction, type FarcasterFrameContext } from "./farcaster";
import { useFrameStack } from "./use-frame-stack";
import { useFetchFrame } from "./use-fetch-frame";
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

export function useFrame<
  TSignerStorageType = Record<string, unknown>,
  TFrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  TFrameContextType extends FrameContext = FarcasterFrameContext,
>({
  homeframeUrl,
  frameContext,
  dangerousSkipSigning,
  onMint = onMintFallback,
  onTransaction = onTransactionFallback,
  transactionDataSuffix,
  onConnectWallet = onConnectWalletFallback,
  onSignature = onSignatureFallback,
  connectedAddress,
  signerState,
  frame,
  /** Ex: /frames */
  frameActionProxy,
  /** Ex: /frames */
  frameGetProxy,
  extraButtonRequestPayload,
  specification = "farcaster",
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
}: UseFrameOptions<
  TSignerStorageType,
  TFrameActionBodyType,
  TFrameContextType
>): FrameState<TSignerStorageType, TFrameContextType> {
  const [inputText, setInputText] = useState("");
  const [framesStack, dispatch, stackAPI] = useFrameStack({
    initialFrame: frame,
    initialFrameUrl: homeframeUrl,
    initialSpecification: specification,
  });

  const fetchFrame = useFetchFrame<
    TSignerStorageType,
    TFrameActionBodyType,
    TFrameContextType
  >({
    stackAPI,
    frameActionProxy,
    frameGetProxy,
    onTransaction,
    transactionDataSuffix,
    onSignature,
    signFrameAction({ actionContext, forceRealSigner }) {
      return dangerousSkipSigning && !forceRealSigner
        ? unsignedFrameAction<
            TSignerStorageType,
            TFrameActionBodyType,
            TFrameContextType
          >(actionContext)
        : signerState.signFrameAction(actionContext);
    },
    specification,
    stackDispatch: dispatch,
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
  const specificationRef = useFreshRef(specification);

  useEffect(() => {
    if (!frame && homeframeUrl) {
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
    } else if (frame) {
      dispatch({
        action: "RESET_INITIAL_FRAME",
        resultOrFrame: frame,
        homeframeUrl,
        specification: specificationRef.current,
      });
    }
  }, [frame, homeframeUrl, dispatch, fetchFrameRef, specificationRef]);

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
      if (!dangerousSkipSigning && !signerState.hasSigner) {
        const error = new Error("Missing signer");
        onErrorRef.current?.(error);

        console.error(`@frames.js/render: ${error.message}`);
        return;
      }
      if (!homeframeUrl) {
        const error = new Error("Missing homeframeUrl");
        onErrorRef.current?.(error);
        console.error(`@frames.js/render: ${error.message}`);
        return;
      }

      const _fetchFrame = fetchFrameOverride ?? fetchFrame;

      await _fetchFrame({
        frameButton,
        isDangerousSkipSigning: dangerousSkipSigning ?? false,
        method: "POST",
        signerStateActionContext: {
          inputText: postInputText,
          signer: signerState.signer ?? null,
          frameContext,
          url: homeframeUrl,
          target,
          frameButton,
          buttonIndex,
          state,
        },
        sourceFrame: currentFrame,
      });
    },
    [
      dangerousSkipSigning,
      fetchFrame,
      frameContext,
      homeframeUrl,
      signerState.hasSigner,
      signerState.signer,
    ]
  );

  const onConnectWalletRef = useRef(onConnectWallet);
  onConnectWalletRef.current = onConnectWallet;

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
      // Send post request to get calldata
      if (!dangerousSkipSigning && !signerState.hasSigner) {
        const error = new Error("Missing signer");
        onErrorRef.current?.(error);

        console.error(`@frames.js/render: ${error.message}`);
        return;
      }
      if (!homeframeUrl) {
        const error = new Error("Missing homeframeUrl");
        onErrorRef.current?.(error);
        console.error(`@frames.js/render: ${error.message}`);
        return;
      }

      if (!connectedAddress) {
        try {
          onConnectWalletRef.current();
        } catch (e) {
          onErrorRef.current?.(e instanceof Error ? e : new Error(String(e)));
          console.error(`@frames.js/render: ${String(e)}`);
        }

        return;
      }

      await fetchFrame({
        frameButton,
        isDangerousSkipSigning: dangerousSkipSigning ?? false,
        method: "POST",
        signerStateActionContext: {
          type: "tx-data",
          inputText: postInputText,
          signer: signerState.signer ?? null,
          frameContext,
          address: connectedAddress,
          url: homeframeUrl,
          target: frameButton.target,
          frameButton,
          buttonIndex,
          state: currentFrame.state,
        },
        sourceFrame: currentFrame,
      });
    },
    [
      fetchFrame,
      dangerousSkipSigning,
      frameContext,
      connectedAddress,
      homeframeUrl,
      signerState,
    ]
  );

  const onButtonPress = useCallback(
    async function onButtonPress(
      currentFrame: Frame,
      frameButton: FrameButton,
      index: number,
      fetchFrameOverride: typeof fetchFrame = fetchFrame
    ): Promise<void> {
      // Button actions that are handled without server interaction don't require signer
      const clientSideActions = ["mint", "link"];
      const buttonRequiresAuth = !clientSideActions.includes(
        frameButton.action
      );

      if (
        !signerState.hasSigner &&
        !dangerousSkipSigning &&
        buttonRequiresAuth
      ) {
        await signerState.onSignerlessFramePress();
        // don't continue, let the app handle
        return;
      }

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
              currentFrame.inputText !== undefined ? inputText : undefined,
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
                currentFrame.inputText !== undefined ? inputText : undefined,
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
      dangerousSkipSigning,
      fetchFrame,
      homeframeUrl,
      inputText,
      onLinkButtonClick,
      onMint,
      onPostButton,
      onTransactionButton,
      signerState,
    ]
  );

  const clearFrameStack = useCallback(() => {
    dispatch({ action: "CLEAR" });
  }, [dispatch]);

  const onCastActionButtonPress: CastActionButtonPressFunction = useCallback(
    async function onActionButtonPress(arg) {
      if (!signerState.hasSigner && !dangerousSkipSigning) {
        await signerState.onSignerlessFramePress();
        // don't continue, let the app handle
        return;
      }

      return fetchFrame(
        {
          method: "CAST_ACTION",
          action: arg.castAction,
          isDangerousSkipSigning: dangerousSkipSigning ?? false,
          signerStateActionContext: {
            signer: signerState.signer ?? null,
            frameContext,
            url: arg.castAction.url,
            target: arg.castAction.url,
            buttonIndex: 1,
          },
        },
        arg.clearStack
      );
    },
    [dangerousSkipSigning, fetchFrame, frameContext, signerState]
  );

  const onComposerActionButtonPress: ComposerActionButtonPressFunction =
    useCallback(
      async function onActionButtonPress(arg) {
        if (!signerState.hasSigner && !dangerousSkipSigning) {
          await signerState.onSignerlessFramePress();
          // don't continue, let the app handle
          return;
        }

        return fetchFrame(
          {
            method: "COMPOSER_ACTION",
            action: arg.castAction,
            isDangerousSkipSigning: dangerousSkipSigning ?? false,
            composerActionState: arg.composerActionState,
            signerStateActionContext: {
              signer: signerState.signer ?? null,
              frameContext,
              url: arg.castAction.url,
              target: arg.castAction.url,
              buttonIndex: 1,
            },
          },
          arg.clearStack
        );
      },
      [dangerousSkipSigning, fetchFrame, frameContext, signerState]
    );

  return useMemo(() => {
    return {
      inputText,
      setInputText,
      clearFrameStack,
      dispatchFrameStack: dispatch,
      onButtonPress,
      fetchFrame,
      homeframeUrl,
      framesStack,
      currentFrameStackItem: framesStack[0],
      onCastActionButtonPress,
      onComposerActionButtonPress,
    };
  }, [
    inputText,
    clearFrameStack,
    dispatch,
    onButtonPress,
    fetchFrame,
    homeframeUrl,
    framesStack,
    onCastActionButtonPress,
    onComposerActionButtonPress,
  ]);
}
