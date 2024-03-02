"use client";

import { useEffect, useState } from "react";
import {
  FrameState,
  onMintArgs,
  FrameContext,
  SignerStateInstance,
  FrameActionBodyPayload,
  FramesStack,
} from "./types";
import type { Frame, FrameButton } from "../types";
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
        },
        trustedData: {
          messageBytes: "0",
        },
      },
    };
  };

export function useFrame<
  T = object,
  B extends FrameActionBodyPayload = FrameActionBodyPayload,
>({
  homeframeUrl,
  frameContext,
  dangerousSkipSigning,
  onMint = onMintFallback,
  signerState,
  frame,
  /** Ex: /frames */
  frameActionProxy,
  /** Ex: /frames */
  frameGetProxy,
  extraButtonRequestPayload,
}: {
  /** skip frame signing, for frames that don't verify signatures */
  dangerousSkipSigning?: boolean;
  /** the route used to POST frame actions. The post_url will be added as a the `url` query parameter */
  frameActionProxy: string;
  /** the route used to GET the initial frame via proxy */
  frameGetProxy: string;
  /** an signer state object used to determine what actions are possible */
  signerState: SignerStateInstance<T, B>;
  /** the url of the homeframe, if null won't load a frame */
  homeframeUrl: string | null;
  /** the initial frame. if not specified will fetch it from the url prop */
  frame?: Frame;
  /** a function to handle mint buttons */
  onMint?: (t: onMintArgs) => void;
  /** the context of this frame, used for generating Frame Action payloads */
  frameContext: FrameContext;
  /**
   * Extra data appended to the frame action payload
   */
  extraButtonRequestPayload?: Record<string, unknown>;
}): FrameState {
  const [inputText, setInputText] = useState("");
  const initialFrame = frame ? { frame: frame, errors: null } : undefined;

  const [framesStack, setFramesStack] = useState<FramesStack>(
    initialFrame
      ? [
          {
            method: "GET",
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
  const [isLoading, setIsLoading] = useState(initialFrame ? false : true);
  // Load initial frame if not defined
  useEffect(() => {
    async function fetchInitialFrame() {
      const tstart = new Date();
      let requestError: unknown | null = null;
      let frame: ReturnType<typeof getFrame> | null = null;
      const requestUrl = `${frameGetProxy}?url=${homeframeUrl}`;

      let stackItem: FramesStack[number];
      try {
        frame = (await (await fetch(requestUrl)).json()) as ReturnType<
          typeof getFrame
        >;
        const tend = new Date();

        stackItem = {
          frame: frame.frame,
          frameValidationErrors: frame.errors,
          method: "GET",
          speed: +((tend.getTime() - tstart.getTime()) / 1000).toFixed(2),
          timestamp: tstart,
          url: homeframeUrl ?? "",
          isValid: Object.keys(frame.errors ?? {}).length === 0,
        };
      } catch (err) {
        const tend = new Date();

        stackItem = {
          url: homeframeUrl ?? "",
          method: "GET",
          requestError,
          speed: +((tend.getTime() - tstart.getTime()) / 1000).toFixed(2),
          timestamp: tstart,
        };

        requestError = err;
      }

      setFramesStack((v) => [stackItem, ...v]);

      setIsLoading(false);
    }

    if (!initialFrame && homeframeUrl) fetchInitialFrame();
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
    } else if (
      frameButton.action === "post" ||
      frameButton.action === "post_redirect"
    ) {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const onPostButton = async ({
    buttonIndex,
    postInputText,
    frameButton,
    dangerousSkipSigning,
    target,
    state,
  }: {
    frameButton: FrameButton;
    buttonIndex: number;
    postInputText: string | undefined;
    state?: string;
    dangerousSkipSigning?: boolean;

    target: string;
  }) => {
    const currentFrame = getCurrentFrame();

    if (!dangerousSkipSigning && !signerState.hasSigner) {
      console.error("missing required auth state");
      return;
    }
    if (!currentFrame || !currentFrame || !homeframeUrl || !frameButton) {
      console.error("missing required value for post");
      return;
    }

    const frameSignatureContext = {
      inputText: postInputText,
      signer: signerState.signer ?? null,
      frameContext,
      url: homeframeUrl,
      target,
      frameButton: frameButton,
      buttonIndex: buttonIndex,
      state,
    };
    const { searchParams, body } = dangerousSkipSigning
      ? await unsignedFrameAction(frameSignatureContext)
      : await signerState.signFrameAction(frameSignatureContext);

    const requestUrl = `${frameActionProxy}?${searchParams.toString()}`;
    const url = searchParams.get("postUrl") ?? "";

    let stackItem: FramesStack[number] | undefined;
    const tstart = new Date();

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
      const dataRes = (await response.json()) as
        | ReturnType<typeof getFrame>
        | { location: string };
      const tend = new Date();

      if ("location" in dataRes) {
        const location = dataRes.location;

        if (window.confirm("You are about to be redirected to " + location!)) {
          window.open(location!, "_blank")?.focus();
        }
      } else {
        stackItem = {
          method: "POST",
          speed: +((tend.getTime() - tstart.getTime()) / 1000).toFixed(2),
          timestamp: tstart,
          url,
          frame: dataRes.frame,
          frameValidationErrors: dataRes.errors,
          isValid: Object.keys(dataRes.errors ?? {}).length === 0,
        };
      }
    } catch (err) {
      const tend = new Date();
      stackItem = {
        url,
        method: "POST",
        requestError: err,
        speed: +((tend.getTime() - tstart.getTime()) / 1000).toFixed(2),
        timestamp: tstart,
      };

      console.error(err);
    }

    setFramesStack((v) => (stackItem ? [stackItem, ...v] : v));
  };

  return {
    isLoading: isLoading,
    inputText,
    setInputText,
    onButtonPress,
    homeframeUrl,
    framesStack: framesStack,
    frame: getCurrentFrame() ?? null,
    isFrameValid: isCurrentFrameValid(),
    frameValidationErrors: getCurrentFrameValidationErrors(),
    error: getCurrentFrameRequestError(),
  };
}
