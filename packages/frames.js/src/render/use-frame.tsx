"use client";

import { useEffect, useState } from "react";
import {
  FrameState,
  onMintArgs,
  FrameContext,
  SignerStateInstance,
  FrameActionBodyPayload,
  FramesStack,
  FrameStackPending,
  FrameRequest,
  UseFrameReturn,
  onTransactionArgs,
} from "./types";
import type { FrameButton, TransactionTargetResponse } from "../types";
import { getFrame } from "../getFrame";
import { getFarcasterTime } from "@farcaster/core";

function onMintFallback({ target }: onMintArgs) {
  if (window.confirm("You are about to be redirected to " + target!)) {
    parent.window.open(target!, "_blank");
  }
}

export const unsignedFrameAction: SignerStateInstance["signFrameAction"] =
  async ({
    buttonIndex,
    frameContext,
    frameButton,
    state,
    target,
    inputText,
    url,
  }) => {
    const searchParams = new URLSearchParams({
      postType: frameButton?.action || "post",
      postUrl: target ?? "",
    });

    return {
      searchParams: searchParams,
      body: {
        untrustedData: {
          url: url,
          timestamp: getFarcasterTime()._unsafeUnwrap(),
          network: 1,
          buttonIndex: buttonIndex,
          castId: {
            fid: frameContext.castId.fid,
            hash: frameContext.castId.hash,
          },
          state,
          inputText,
          address: frameContext.connectedAddress,
        },
        trustedData: {
          messageBytes: "0",
        },
      },
    };
  };
async function onTransactionFallback({ transactionData }: onTransactionArgs) {
  window.alert(
    `Requesting a transaction on chain with ID ${transactionData.chainId} with the following params: ${JSON.stringify(transactionData.params, null, 2)}`
  );
  return null;
}

export const fallbackFrameContext: FrameContext = {
  castId: {
    fid: 1,
    hash: "0x0000000000000000000000000000000000000000" as const,
  },
  connectedAddress: "0x0000000000000000000000000000000000000001",
};

export function useFrame<
  T = object,
  B extends FrameActionBodyPayload = FrameActionBodyPayload,
>({
  homeframeUrl,
  frameContext,
  dangerousSkipSigning,
  onMint = onMintFallback,
  onTransaction = onTransactionFallback,
  signerState,
  frame,
  /** Ex: /frames */
  frameActionProxy,
  /** Ex: /frames */
  frameGetProxy,
  extraButtonRequestPayload,
}: UseFrameReturn<T, B>): FrameState {
  const [inputText, setInputText] = useState("");
  const initialFrame = frame ? { frame: frame, errors: null } : undefined;

  const [framesStack, setFramesStack] = useState<FramesStack>(
    initialFrame
      ? [
          {
            method: "GET",
            request: {},
            responseStatus: 200,
            timestamp: new Date(),
            url: homeframeUrl ?? "",
            isValid: true,
            frameValidationErrors: null,
            speed: 0,
            ...initialFrame,
          },
        ]
      : []
  );

  const [isLoading, setIsLoading] = useState<FrameStackPending | null>(
    // prevent flash of empty if will shortly set this in first rerender
    homeframeUrl && !initialFrame
      ? {
          request: {},
          method: "GET" as const,
          timestamp: new Date(),
          url: homeframeUrl ?? "",
        }
      : null
  );

  async function fetchFrame({ method, url, request }: FrameRequest) {
    if (method === "GET") {
      const tstart = new Date();

      const frameStackBase = {
        request: {},
        method: "GET" as const,
        timestamp: tstart,
        url: url ?? "",
      };
      setIsLoading(frameStackBase);

      let requestError: unknown | null = null;
      let newFrame: ReturnType<typeof getFrame> | null = null;
      const searchParams = new URLSearchParams({ url });
      const proxiedUrl = `${frameGetProxy}?${searchParams.toString()}`;

      let stackItem: FramesStack[number];
      let response;
      try {
        response = await fetch(proxiedUrl);
        newFrame = (await response.json()) as ReturnType<typeof getFrame>;
        const tend = new Date();

        stackItem = {
          ...frameStackBase,
          frame: newFrame.frame,
          frameValidationErrors: newFrame.errors,
          speed: +((tend.getTime() - tstart.getTime()) / 1000).toFixed(2),
          responseStatus: response.status,
          isValid: Object.keys(newFrame.errors ?? {}).length === 0,
        };
      } catch (err) {
        const tend = new Date();

        stackItem = {
          ...frameStackBase,
          url: url ?? "",
          responseStatus: response?.status ?? 500,
          requestError,
          speed: +((tend.getTime() - tstart.getTime()) / 1000).toFixed(2),
        };

        requestError = err;
      }
      setFramesStack((v) => [stackItem, ...v]);
    } else {
      const tstart = new Date();
      const frameStackBase = {
        method: "POST" as const,
        request: {
          searchParams: request.searchParams,
          body: request.body,
        },
        timestamp: tstart,
        url: url,
      };
      setIsLoading(frameStackBase);
      let stackItem: FramesStack[number] | undefined;
      const proxiedUrl = `${frameActionProxy}?${request.searchParams.toString()}`;

      let response;
      try {
        response = await fetch(proxiedUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...extraButtonRequestPayload,
            ...request.body,
          }),
        });
        const dataRes = (await response.json()) as
          | ReturnType<typeof getFrame>
          | { location: string };
        const tend = new Date();

        if ("location" in dataRes) {
          const location = dataRes.location;

          if (
            window.confirm("You are about to be redirected to " + location!)
          ) {
            window.open(location!, "_blank")?.focus();
          }
        } else {
          stackItem = {
            ...frameStackBase,
            responseStatus: response.status,
            speed: +((tend.getTime() - tstart.getTime()) / 1000).toFixed(2),
            frame: dataRes.frame,
            frameValidationErrors: dataRes.errors,
            isValid: Object.keys(dataRes.errors ?? {}).length === 0,
          };
        }
      } catch (err) {
        const tend = new Date();
        stackItem = {
          ...frameStackBase,
          responseStatus: response?.status ?? 500,
          requestError: err,
          speed: +((tend.getTime() - tstart.getTime()) / 1000).toFixed(2),
        };

        console.error(err);
      }

      setFramesStack((v) => (stackItem ? [stackItem, ...v] : v));
    }
    setIsLoading(null);
  }

  // Load initial frame if not defined
  useEffect(() => {
    if (!initialFrame && homeframeUrl) {
      fetchFrame({
        url: homeframeUrl,
        method: "GET",
        request: {},
      });
    }
  }, [initialFrame, homeframeUrl]);

  function getCurrentFrame() {
    const [frame] = framesStack;

    return frame && "frame" in frame ? frame.frame : null;
  }

  function isCurrentFrameValid() {
    const [frame] = framesStack;

    return frame && "frameValidationErrors" in frame
      ? Object.keys(frame.frameValidationErrors ?? {}).length === 0
      : undefined;
  }

  function getCurrentFrameValidationErrors() {
    const [frame] = framesStack;

    return frame && "frameValidationErrors" in frame
      ? frame.frameValidationErrors
      : null;
  }

  function getCurrentFrameRequestError() {
    const [frame] = framesStack;

    return frame && "requestError" in frame ? frame.requestError : null;
  }

  const onButtonPress = async (frameButton: FrameButton, index: number) => {
    const currentFrame = getCurrentFrame();

    if (!currentFrame) {
      // todo: proper error handling
      console.error("missing frame");
      return;
    }
    if (!signerState.hasSigner && !dangerousSkipSigning) {
      signerState.onSignerlessFramePress();
      // don't continue, let the app handle
      return;
    }
    const target = frameButton.target ?? currentFrame.postUrl ?? homeframeUrl;
    if (frameButton.action === "link") {
      if (window.confirm("You are about to be redirected to " + target!)) {
        parent.window.open(target!, "_blank");
      }
    } else if (frameButton.action === "mint") {
      onMint({ frameButton, target, frame: currentFrame });
    } else if (frameButton.action === "tx") {
      const transactionData = await onTransactionRequest({
        frameButton: frameButton,
        target: target,
        buttonIndex: index + 1,
        postInputText:
          currentFrame.inputText !== undefined ? inputText : undefined,
        state: currentFrame.state,
      });
      if (transactionData) {
        const transactionId = await onTransaction({
          frame: currentFrame,
          frameButton: frameButton,
          transactionData,
        });
        if (transactionId) {
          await onPostButton({
            frameButton: frameButton,
            target: currentFrame.postUrl, // transaction_ids must be posted to post_url
            buttonIndex: index + 1,
            postInputText:
              currentFrame.inputText !== undefined ? inputText : undefined,
            state: currentFrame.state,
            transactionId,
          });
        }
      }
    } else if (
      frameButton.action === "post" ||
      frameButton.action === "post_redirect"
    ) {
      try {
        await onPostButton({
          frameButton: frameButton,
          target: target,
          dangerousSkipSigning: dangerousSkipSigning,

          buttonIndex: index + 1,
          /** https://docs.farcaster.xyz/reference/frames/spec#handling-clicks

        POST the packet to fc:frame:button:$idx:action:target if present
        POST the packet to fc:frame:post_url if target was not present.
        POST the packet to or the frame's embed URL if neither target nor action were present.
        */
          postInputText:
            currentFrame.inputText !== undefined ? inputText : undefined,
          state: currentFrame.state,
        });
        setInputText("");
      } catch (err) {
        alert("error: check the console");
        console.error(err);
      }
    }
  };

  const onPostButton = async ({
    buttonIndex,
    postInputText,
    frameButton,
    dangerousSkipSigning,
    target,
    state,
    transactionId,
  }: {
    frameButton: FrameButton;
    buttonIndex: number;
    postInputText: string | undefined;
    state?: string;
    dangerousSkipSigning?: boolean;
    transactionId?: `0x${string}`;

    target: string;
  }) => {
    const currentFrame = getCurrentFrame();

    if (!dangerousSkipSigning && !signerState.hasSigner) {
      console.error("frames.js: missing required auth state");
      return;
    }
    if (!currentFrame || !currentFrame || !homeframeUrl || !frameButton) {
      console.error("frames.js: missing required value for post");
      return;
    }

    const frameSignatureContext = {
      inputText: postInputText,
      signer: signerState.signer ?? null,
      frameContext: {
        castId: frameContext.castId,
      },
      url: homeframeUrl,
      target: target,
      frameButton: frameButton,
      buttonIndex: buttonIndex,
      state,
      transactionId,
    };
    const { searchParams, body } = dangerousSkipSigning
      ? await unsignedFrameAction(frameSignatureContext)
      : await signerState.signFrameAction(frameSignatureContext);

    await fetchFrame({
      // post_url stuff
      url: searchParams.get("postUrl") ?? "/",
      method: "POST",
      request: {
        searchParams,
        body,
      },
    });
  };

  const onTransactionRequest = async ({
    buttonIndex,
    postInputText,
    frameButton,
    target,
    state,
  }: {
    frameButton: FrameButton;
    buttonIndex: number;
    postInputText: string | undefined;
    state?: string;
    target: string;
  }) => {
    // Send post request to get calldata
    const currentFrame = getCurrentFrame();

    if (!dangerousSkipSigning && !signerState.hasSigner) {
      console.error("frames.js: missing required auth state");
      return;
    }
    if (!currentFrame || !currentFrame || !homeframeUrl || !frameButton) {
      console.error("frames.js: missing required value for post");
      return;
    }

    const { searchParams, body } = await signerState.signFrameAction({
      inputText: postInputText,
      signer: signerState.signer ?? null,
      frameContext: {
        castId: frameContext.castId,
        connectedAddress: frameContext.connectedAddress,
      },
      url: homeframeUrl,
      target,
      frameButton: frameButton,
      buttonIndex: buttonIndex,
      state,
    });
    searchParams.append("postType", "tx");

    const requestUrl = `${frameActionProxy}?${searchParams.toString()}`;

    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...extraButtonRequestPayload,
          ...body,
        }),
      });
      const transactionResponse =
        (await response.json()) as TransactionTargetResponse;
      return transactionResponse;
    } catch {
      throw new Error(
        `frames.js: Could not fetch transaction data from "${searchParams.get("postUrl")}"`
      );
    }
  };

  return {
    isLoading: isLoading,
    inputText,
    setInputText,
    clearFrameStack: () => setFramesStack([]),
    onButtonPress,
    fetchFrame,
    homeframeUrl,
    framesStack: framesStack,
    frame: getCurrentFrame() ?? null,
    isFrameValid: isCurrentFrameValid(),
    frameValidationErrors: getCurrentFrameValidationErrors(),
    error: getCurrentFrameRequestError(),
  };
}
