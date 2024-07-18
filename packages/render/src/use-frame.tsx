/* eslint-disable @typescript-eslint/require-await -- we expect async functions */
/* eslint-disable no-console -- provide feedback */
/* eslint-disable no-alert -- provide feedback */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Frame,
  FrameButton,
  FrameButtonLink,
  FrameButtonPost,
  FrameButtonTx,
  TransactionTargetResponse,
} from "frames.js";
import { getFarcasterTime } from "@farcaster/core";
import type {
  FrameState,
  OnMintArgs,
  FrameContext,
  FrameActionBodyPayload,
  UseFrameOptions,
  OnTransactionArgs,
  OnSignatureArgs,
  CastActionButtonPressFunction,
  SignerStateActionContext,
  SignedFrameAction,
} from "./types";
import type { FarcasterFrameContext } from "./farcaster";
import { useFrameStack } from "./use-frame-stack";
import { useFetchFrame } from "./use-fetch-frame";

function onMintFallback({ target }: OnMintArgs): void {
  console.log("Please provide your own onMint function to useFrame() hook.");

  const message = `Mint requested: ${target}`;

  if (typeof window !== "undefined") {
    window.alert(message);
  } else {
    console.log(message);
  }
}

export async function unsignedFrameAction<
  TSignerStorageType = object,
  TFrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  TFrameContextType extends FrameContext = FarcasterFrameContext,
>({
  buttonIndex,
  frameContext,
  frameButton,
  state,
  target,
  inputText,
  url,
}: SignerStateActionContext<TSignerStorageType, TFrameContextType>): Promise<
  SignedFrameAction<TFrameActionBodyType>
> {
  const searchParams = new URLSearchParams({
    postType: frameButton.action,
    postUrl: target ?? "",
  });

  const isFarcaster = "castId" in frameContext;

  return {
    searchParams,
    // @todo properly define the type of  TFrameActionBodyType so it covers all usages, farcaster, xmtp, lens
    body: {
      untrustedData: {
        url,
        timestamp: isFarcaster
          ? getFarcasterTime()._unsafeUnwrap()
          : Date.now(),
        ...(isFarcaster ? { network: 1 } : {}),
        buttonIndex,
        state,
        inputText,
        address: frameContext.connectedAddress,
        ...frameContext,
      },
      trustedData: {
        messageBytes: Buffer.from("").toString("hex"),
      },
    } as unknown as TFrameActionBodyType,
  };
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

function defaultComposerFormActionHandler(): Promise<{ frameUrl: string }> {
  throw new Error('Please implement your own "onComposerFormAction" handler');
}

export function useFrame<
  TSignerStorageType = object,
  TFrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  TFrameContextType extends FrameContext = FarcasterFrameContext,
>({
  homeframeUrl,
  frameContext,
  dangerousSkipSigning,
  onMint = onMintFallback,
  onTransaction = onTransactionFallback,
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
}: UseFrameOptions<
  TSignerStorageType,
  TFrameActionBodyType,
  TFrameContextType
>): FrameState<TSignerStorageType, TFrameContextType> {
  const [inputText, setInputText] = useState("");
  const [framesStack, dispatch, stackAPI] = useFrameStack({
    initialFrame: frame,
    initialFrameUrl: homeframeUrl,
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
  });

  const fetchFrameRef = useRef(fetchFrame);
  fetchFrameRef.current = fetchFrame;

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
      });
    }
  }, [frame, homeframeUrl, dispatch]);

  const onPostButton = useCallback(
    async function onPostButton({
      currentFrame,
      buttonIndex,
      postInputText,
      frameButton,
      target,
      state,
      transactionId,
      fetchFrameOverride,
    }: {
      currentFrame: Frame;
      frameButton: FrameButtonPost;
      buttonIndex: number;
      postInputText: string | undefined;
      state?: string;
      transactionId?: `0x${string}`;
      target: string;
      fetchFrameOverride?: typeof fetchFrame;
    }): Promise<void> {
      if (!dangerousSkipSigning && !signerState.hasSigner) {
        console.error("frames.js: missing required auth state");
        return;
      }
      if (!homeframeUrl) {
        console.error("frames.js: missing required value for post");
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
          transactionId,
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
        console.error("frames.js: missing required auth state");
        return;
      }
      if (!homeframeUrl) {
        console.error("frames.js: missing required value for post");
        return;
      }

      await fetchFrame({
        frameButton,
        isDangerousSkipSigning: dangerousSkipSigning ?? false,
        method: "POST",
        signerStateActionContext: {
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
        signerState.onSignerlessFramePress();
        // don't continue, let the app handle
        return;
      }

      switch (frameButton.action) {
        case "link": {
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
              frameButton.target || currentFrame.postUrl || homeframeUrl;

            if (!target) {
              throw new Error("missing target");
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
              onError?.(err);
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
      onError,
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
        signerState.onSignerlessFramePress();
        // don't continue, let the app handle
        return;
      }

      return fetchFrame(
        {
          method: "CAST_OR_COMPOSER_ACTION",
          action: arg.castAction,
          isDangerousSkipSigning: dangerousSkipSigning ?? false,
          composerActionState: arg.composerActionState ?? {
            text: "Default cast text",
            embeds: [],
          },
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
  ]);
}
