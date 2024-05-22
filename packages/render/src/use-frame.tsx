/* eslint-disable @typescript-eslint/require-await -- we expect async functions */
/* eslint-disable no-console -- provide feedback */
/* eslint-disable no-alert -- provide feedback */
"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Frame,
  FrameButton,
  FrameButtonPost,
  FrameButtonTx,
  TransactionTargetResponse,
} from "frames.js";
import { getFarcasterTime } from "@farcaster/core";
import type {
  FrameState,
  OnMintArgs,
  FrameContext,
  SignerStateInstance,
  FrameActionBodyPayload,
  UseFrameReturn,
  OnTransactionArgs,
} from "./types";
import type { FarcasterFrameContext } from "./farcaster";
import { useFrameStack } from "./use-frame-stack";
import { useFetchFrame } from "./use-fetch-frame";

function onMintFallback({ target }: OnMintArgs): void {
  window.alert(`Mint requested: ${target}`);
}

export const unsignedFrameAction: SignerStateInstance<
  object,
  FrameActionBodyPayload,
  FrameContext
>["signFrameAction"] = async ({
  buttonIndex,
  frameContext,
  frameButton,
  state,
  target,
  inputText,
  url,
}) => {
  const searchParams = new URLSearchParams({
    postType: frameButton.action,
    postUrl: target ?? "",
  });

  const isFarcaster = "castId" in frameContext;

  return {
    searchParams,
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
    },
  };
};

async function onTransactionFallback({
  transactionData,
}: OnTransactionArgs): Promise<null> {
  window.alert(
    `Requesting a transaction on chain with ID ${
      transactionData.chainId
    } with the following params: ${JSON.stringify(
      transactionData.params,
      null,
      2
    )}`
  );
  return null;
}

export const fallbackFrameContext: FarcasterFrameContext = {
  castId: {
    fid: 1,
    hash: "0x0000000000000000000000000000000000000000" as const,
  },
  address: "0x0000000000000000000000000000000000000001",
};

export function useFrame<
  SignerStorageType = object,
  FrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  FrameContextType extends FrameContext = FarcasterFrameContext,
>({
  homeframeUrl,
  frameContext,
  dangerousSkipSigning,
  onMint = onMintFallback,
  onTransaction = onTransactionFallback,
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
}: UseFrameReturn<
  SignerStorageType,
  FrameActionBodyType,
  FrameContextType
>): FrameState {
  const [inputText, setInputText] = useState("");
  const [framesStack, dispatch] = useFrameStack({
    initialFrame: frame,
    initialFrameUrl: homeframeUrl,
  });

  const fetchFrame = useFetchFrame({
    frameActionProxy,
    frameGetProxy,
    onTransaction,
    signFrameAction(isDangerousSkipSigning, actionContext) {
      return isDangerousSkipSigning
        ? unsignedFrameAction(actionContext)
        : signerState.signFrameAction(actionContext);
    },
    specification,
    stackDispatch: dispatch,
    extraButtonRequestPayload,
    homeframeUrl,
    onError,
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

  async function onButtonPress(
    currentFrame: Frame,
    frameButton: FrameButton,
    index: number,
    fetchFrameOverride: typeof fetchFrame = fetchFrame
  ): Promise<void> {
    if (!signerState.hasSigner && !dangerousSkipSigning) {
      signerState.onSignerlessFramePress();
      // don't continue, let the app handle
      return;
    }

    switch (frameButton.action) {
      case "link": {
        if (
          window.confirm(
            `You are about to be redirected to ${frameButton.target}`
          )
        ) {
          parent.window.open(frameButton.target, "_blank");
        }
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
          alert("error: check the console");
          console.error(err);
        }
        break;
      }
      default:
        throw new Error("Unrecognized frame button action");
    }
  }

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
  }

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
    const currentFrameStackItem = framesStack[0];

    if (!dangerousSkipSigning && !signerState.hasSigner) {
      console.error("frames.js: missing required auth state");
      return;
    }
    if (!currentFrameStackItem || !homeframeUrl) {
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
  }

  return {
    inputText,
    setInputText,
    clearFrameStack: () => {
      dispatch({ action: "CLEAR" });
    },
    dispatchFrameStack: dispatch,
    onButtonPress,
    fetchFrame,
    homeframeUrl,
    framesStack,
    frame: framesStack[0],
  };
}
