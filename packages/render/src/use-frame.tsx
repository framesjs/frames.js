/* eslint-disable @typescript-eslint/require-await -- we expect async functions */
/* eslint-disable no-console -- provide feedback */
/* eslint-disable no-alert -- provide feedback */
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Frame,
  FrameButtonLink,
  FrameButtonPost,
  FrameButtonTx,
  SupportedParsingSpecification,
  TransactionTargetResponse,
} from "frames.js";
import type { ParseFramesWithReportsResult } from "frames.js/frame-parsers";
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
  ResolveFrameActionContextResult,
  ButtonPressFunction,
  AllowedStorageTypes,
  SignerStateInstance,
  ResolveFrameActionContextArgumentAction,
} from "./types";
import { useFrameStack } from "./use-frame-stack";
import { useFetchFrame } from "./use-fetch-frame";
import { useFreshRef } from "./hooks/use-fresh-ref";
import type { FarcasterFrameContext } from "./farcaster/types";

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

function sanitizeSpecification(
  specification: SupportedParsingSpecification | SupportedParsingSpecification[]
): SupportedParsingSpecification[] {
  const value = Array.isArray(specification) ? specification : [specification];

  if (value.length === 0) {
    return ["farcaster"];
  }

  return value;
}

export function useFrame<
  TSignerStorageType extends AllowedStorageTypes = Record<string, unknown>,
  TFrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  TFrameContextType extends FrameContext = FarcasterFrameContext,
>({
  homeframeUrl,
  frameContext,
  dangerousSkipSigning = false,
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
  resolveActionContext,
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
>): FrameState {
  const [inputText, setInputText] = useState("");
  const inputTextRef = useFreshRef(inputText);
  const [framesStack, stackAPI] = useFrameStack({
    initialFrame: frame,
    initialFrameUrl: homeframeUrl,
  });
  const [specifications, setSpecifications] = useState(() =>
    sanitizeSpecification(specification)
  );
  const specificationsRef = useFreshRef(specifications);
  const resolveActionContextRef = useFreshRef(resolveActionContext);
  const onErrorRef = useFreshRef(onError);
  const signerStateRef = useFreshRef(signerState);
  const frameContextRef = useFreshRef(frameContext);
  const dangerousSkipSigningRef = useFreshRef(dangerousSkipSigning);
  const onConnectWalletRef = useFreshRef(onConnectWallet);
  const onMintRef = useFreshRef(onMint);
  const onLinkButtonClickRef = useFreshRef(onLinkButtonClick);
  const connectedAddressRef = useFreshRef(connectedAddress);

  const {
    clear: clearFrameStack,
    dispatch,
    reset: resetToInitialFrame,
  } = stackAPI;

  const frameStackRef = useFreshRef(framesStack);
  const fetchFrame = useFetchFrame({
    dangerousSkipSigning,
    stackAPI,
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

  const resolveInternalActionContext = useCallback(
    async (
      action: ResolveFrameActionContextArgumentAction
    ): Promise<ResolveFrameActionContextResult> => {
      if (!resolveActionContextRef.current) {
        return {
          frameContext: frameContextRef.current,
          // it is a signer state just generic params don't match, but the expected type is more
          // forgiving so we can just use defaults
          signerState:
            signerStateRef.current as unknown as SignerStateInstance<AllowedStorageTypes>,
        };
      }

      return resolveActionContextRef.current({
        frameStack: frameStackRef.current,
        specifications: specificationsRef.current,
        action,
      });
    },
    [
      frameContextRef,
      frameStackRef,
      resolveActionContextRef,
      signerStateRef,
      specificationsRef,
    ]
  );

  const onPostButton = useCallback(
    async function onPostButton({
      parseResult,
      specification: activeSpecification,
      buttonIndex,
      postInputText,
      frameButton,
      target,
      state,
      fetchFrameOverride,
    }: {
      parseResult: ParseFramesWithReportsResult;
      specification: SupportedParsingSpecification;
      frameButton: FrameButtonPost;
      buttonIndex: number;
      postInputText: string | undefined;
      state?: string;
      target: string;
      fetchFrameOverride?: typeof fetchFrame;
    }): Promise<void> {
      const currentFrame = parseResult[activeSpecification].frame;

      // normally this shouldn't happen because not having homeframeUrl will prevent ui from being rendered
      if (!homeframeUrl) {
        const error = new Error("Missing homeframeUrl");
        onErrorRef.current?.(error);
        console.error(`@frames.js/render: ${error.message}`);
        return;
      }

      const resolvedActionContext = await resolveInternalActionContext({
        type: "frame",
        parseResult,
        specification: activeSpecification,
      });

      if (
        !dangerousSkipSigningRef.current &&
        !resolvedActionContext.signerState.hasSigner
      ) {
        const error = new Error("Missing signer");
        onErrorRef.current?.(error);

        console.error(`@frames.js/render: ${error.message}`);
        return;
      }

      const _fetchFrame = fetchFrameOverride ?? fetchFrameRef.current;

      await _fetchFrame({
        frameButton,
        isDangerousSkipSigning: dangerousSkipSigningRef.current,
        method: "POST",
        signerStateActionContext: {
          inputText: postInputText,
          signer: resolvedActionContext.signerState
            .signer as AllowedStorageTypes,
          frameContext: resolvedActionContext.frameContext,
          url: homeframeUrl,
          target,
          frameButton,
          buttonIndex,
          state,
        },
        signerState: resolvedActionContext.signerState,
        // @todo change to support partial frame as well?
        sourceFrame: currentFrame as Frame,
        sourceParseResult: parseResult,
        specification: activeSpecification,
      });
    },
    [
      dangerousSkipSigningRef,
      fetchFrameRef,
      homeframeUrl,
      onErrorRef,
      resolveInternalActionContext,
    ]
  );

  const onTransactionButton = useCallback(
    async function onTransactionButton({
      parseResult,
      specification: activeSpecification,
      buttonIndex,
      postInputText,
      frameButton,
    }: {
      parseResult: ParseFramesWithReportsResult;
      specification: SupportedParsingSpecification;
      frameButton: FrameButtonTx;
      buttonIndex: number;
      postInputText: string | undefined;
    }): Promise<TransactionTargetResponse | undefined> {
      const currentFrame = parseResult[activeSpecification].frame;

      // normally this shouldn't happen because not having homeframeUrl will prevent ui from being rendered
      if (!homeframeUrl) {
        const error = new Error("Missing homeframeUrl");
        onErrorRef.current?.(error);
        console.error(`@frames.js/render: ${error.message}`);
        return;
      }

      const resolvedActionContext = await resolveInternalActionContext({
        type: "frame",
        parseResult,
        specification: activeSpecification,
      });
      const currentConnectedAddress = connectedAddressRef.current;

      // Send post request to get calldata
      if (
        !dangerousSkipSigningRef.current &&
        !resolvedActionContext.signerState.hasSigner
      ) {
        const error = new Error("Missing signer");
        onErrorRef.current?.(error);

        console.error(`@frames.js/render: ${error.message}`);
        return;
      }

      if (!currentConnectedAddress) {
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
        isDangerousSkipSigning: dangerousSkipSigningRef.current,
        method: "POST",
        signerStateActionContext: {
          type: "tx-data",
          inputText: postInputText,
          signer: resolvedActionContext.signerState
            .signer as AllowedStorageTypes,
          frameContext: resolvedActionContext.frameContext,
          address: currentConnectedAddress,
          url: homeframeUrl,
          target: frameButton.target,
          frameButton,
          buttonIndex,
          state: currentFrame.state,
        },
        signerState: resolvedActionContext.signerState,
        // @todo change to support partial frame as well?
        sourceFrame: currentFrame as Frame,
        sourceParseResult: parseResult,
        specification: activeSpecification,
      });
    },
    [
      homeframeUrl,
      resolveInternalActionContext,
      connectedAddressRef,
      dangerousSkipSigningRef,
      fetchFrameRef,
      onErrorRef,
      onConnectWalletRef,
    ]
  );

  const onButtonPress: ButtonPressFunction = useCallback(
    async function onButtonPress({
      parseResult,
      specification: activeSpecification,
      frameButton,
      index,
      fetchFrameOverride,
    }) {
      const currentFrame = parseResult[activeSpecification].frame;

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

          onLinkButtonClickRef.current(frameButton);
          break;
        }
        case "mint": {
          onMintRef.current({
            frameButton,
            target: frameButton.target,
            // can be also partial frame if allowed
            // @todo change type to support partial frame?
            frame: currentFrame as Frame,
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
            parseResult,
            specification: activeSpecification,
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
              parseResult,
              frameButton,
              specification: activeSpecification,
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
      onLinkButtonClickRef,
      onMintRef,
      onPostButton,
      onTransactionButton,
    ]
  );

  const onCastActionButtonPress: CastActionButtonPressFunction = useCallback(
    async function onActionButtonPress(arg) {
      const resolvedActionContext = await resolveInternalActionContext({
        type: "cast",
      });

      if (
        !resolvedActionContext.signerState.hasSigner &&
        !dangerousSkipSigningRef.current
      ) {
        await resolvedActionContext.signerState.onSignerlessFramePress();
        // don't continue, let the app handle
        return;
      }

      return fetchFrameRef.current(
        {
          method: "CAST_ACTION",
          action: arg.castAction,
          isDangerousSkipSigning: dangerousSkipSigningRef.current,
          signerStateActionContext: {
            signer: resolvedActionContext.signerState
              .signer as AllowedStorageTypes,
            frameContext: resolvedActionContext.frameContext,
            url: arg.castAction.url,
            target: arg.castAction.url,
            buttonIndex: 1,
          },
          signerState: resolvedActionContext.signerState,
        },
        arg.clearStack
      );
    },
    [dangerousSkipSigningRef, fetchFrameRef, resolveInternalActionContext]
  );

  const onComposerActionButtonPress: ComposerActionButtonPressFunction =
    useCallback(
      async function onActionButtonPress(arg) {
        const resolvedActionContext = await resolveInternalActionContext({
          type: "composer",
        });

        if (
          !resolvedActionContext.signerState.hasSigner &&
          !dangerousSkipSigningRef.current
        ) {
          await resolvedActionContext.signerState.onSignerlessFramePress();
          // don't continue, let the app handle
          return;
        }

        return fetchFrameRef.current(
          {
            method: "COMPOSER_ACTION",
            action: arg.castAction,
            isDangerousSkipSigning: dangerousSkipSigningRef.current,
            composerActionState: arg.composerActionState,
            signerStateActionContext: {
              signer: resolvedActionContext.signerState
                .signer as AllowedStorageTypes,
              frameContext: resolvedActionContext.frameContext,
              url: arg.castAction.url,
              target: arg.castAction.url,
              buttonIndex: 1,
            },
            signerState: resolvedActionContext.signerState,
          },
          arg.clearStack
        );
      },
      [dangerousSkipSigningRef, fetchFrameRef, resolveInternalActionContext]
    );

  // update specifications only if they changed
  // this makes sure that even if the user is passing always a new array it will not trigger a re-render
  useEffect(() => {
    const newSpecifications = sanitizeSpecification(specification);

    if (JSON.stringify(newSpecifications) !== JSON.stringify(specifications)) {
      setSpecifications(newSpecifications);
    }
  }, [specification, specifications]);

  useEffect(() => {
    // if there is no homeframeUrl then we treat the useFrame as "disabled"
    // meaning it will not fetch anything nor show anything
    if (!homeframeUrl) {
      // thre is no frame url or user removed the url
      clearFrameStack();
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
      resetToInitialFrame({
        frame,
        homeframeUrl,
      });
    }
  }, [
    frame,
    homeframeUrl,
    resetToInitialFrame,
    clearFrameStack,
    fetchFrameRef,
  ]);

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
      specifications,
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
    specifications,
  ]);
}
