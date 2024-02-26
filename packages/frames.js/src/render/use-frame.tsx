import { useEffect, useState } from "react";
import {
  FrameState,
  onMintArgs,
  FrameContext,
  AuthStateInstance,
  FrameActionBodyPayload,
  FramesStack,
} from "./types";
import type { Frame, FrameButton } from "../types";
import { getFrame } from "../getFrame";

function onMintFallback({ target }: onMintArgs) {
  if (window.confirm("You are about to be redirected to " + target!)) {
    parent.window.open(target!, "_blank");
  }
}

export const fallbackFrameContext = {
  castId: {
    fid: 1,
    hash: "0x0000000000000000000000000000000000000000" as const,
  },
};

export function useFrame<
  T = object,
  B extends FrameActionBodyPayload = FrameActionBodyPayload,
>({
  homeframeUrl,
  frameContext,
  onMint = onMintFallback,
  authState,
  frame,
  /** Ex: /frames */
  frameActionRoute,
  /** Ex: /frames */
  frameFetchRoute,
  extraButtonRequestPayload,
}: {
  /** the route used to POST frame actions. The post_url will be added as a the `url` query parameter */
  frameActionRoute: string;
  /** the route used to GET the initial frame via proxy */
  frameFetchRoute: string;
  /** an auth state object used to determine what actions are possible */
  authState: AuthStateInstance<T, B>;
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
  const [framesStack, setFramesStack] = useState<FramesStack>([]);
  const initialFrame = frame ? { frame: frame, errors: null } : undefined;
  const [isLoading, setIsLoading] = useState(initialFrame ? false : true);
  // Load initial frame if not defined
  useEffect(() => {
    async function fetchInitialFrame() {
      const tstart = new Date();
      let requestError: unknown = null;
      let frame: ReturnType<typeof getFrame> | null = null;
      const requestUrl = `${frameFetchRoute}?url=${homeframeUrl}`;

      try {
        frame = (await (await fetch(requestUrl)).json()) as ReturnType<
          typeof getFrame
        >;
      } catch (err) {
        requestError = err;
      }
      const tend = new Date();

      const diff = +((tend.getTime() - tstart.getTime()) / 1000).toFixed(2);
      setFramesStack((v) => [
        {
          method: "GET",
          speed: diff,
          timestamp: tstart,
          url: homeframeUrl ?? "",
          frame: frame?.frame ?? null,
          frameValidationErrors: frame?.errors ?? null,
          requestError: requestError,
        },
        ...v,
      ]);
      setIsLoading(false);
    }

    if (!initialFrame && homeframeUrl) fetchInitialFrame();
  }, [initialFrame, homeframeUrl]);

  function getCurrentFrame() {
    return framesStack.length ? framesStack[0]?.frame : null;
  }

  const onButtonPress = async (frameButton: FrameButton, index: number) => {
    const currentFrame = getCurrentFrame();
    if (!currentFrame) {
      console.error("missing frame");
      return;
    }
    if (!authState.isLoggedIn) {
      authState.promptLogin();
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
          buttonIndex: index + 1,
          /** https://docs.farcaster.xyz/reference/frames/spec#handling-clicks

        POST the packet to fc:frame:button:$idx:action:target if present
        POST the packet to fc:frame:post_url if target was not present.
        POST the packet to or the frame's embed URL if neither target nor action were present.
        */
          postInputText:
            currentFrame.inputText !== undefined ? inputText : undefined,
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
    target,
  }: {
    frameButton: FrameButton;
    buttonIndex: number;
    postInputText: string | undefined;
    target: string;
  }) => {
    const currentFrame = getCurrentFrame();

    if (
      !authState.isLoggedIn ||
      !currentFrame ||
      !homeframeUrl ||
      !frameButton
    ) {
      console.error("missing required value for post");
      return;
    }

    const { searchParams, body } = await authState.signFrameAction({
      inputText: postInputText,
      frameContext,
      url: homeframeUrl,
      target,
      frameButton: frameButton,
      buttonIndex: buttonIndex,
    });
    const requestUrl = `${frameActionRoute}?${searchParams.toString()}`;
    let requestError: unknown = null;

    let frame: ReturnType<typeof getFrame> | null = null;
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
      const dataRes = await response.json();
      frame = dataRes;
      if (response.status === 302) {
        const location = dataRes.location;
        if (window.confirm("You are about to be redirected to " + location!)) {
          window.open(location!, "_blank")?.focus();
        }
      }
    } catch (err) {
      requestError = err;
      console.error(err);
    }
    const tend = new Date();
    const diff = +((tend.getTime() - tstart.getTime()) / 1000).toFixed(2);
    setFramesStack((v) => [
      {
        method: "POST",
        speed: diff,
        timestamp: tstart,
        url: searchParams.get("postUrl") ?? "",
        frame: frame?.frame ?? null,
        frameValidationErrors: frame?.errors ?? null,
        requestError: requestError,
      },
      ...v,
    ]);
  };

  return {
    isLoading: isLoading,
    inputText,
    setInputText,
    onButtonPress,
    homeframeUrl,
    framesStack: framesStack,
    frame: getCurrentFrame() ?? null,
    isFrameValid: framesStack.length
      ? Object.keys(framesStack[0]?.frameValidationErrors ?? {}).length === 0
      : undefined,
    frameValidationErrors: framesStack[0]?.frameValidationErrors,
    error: framesStack[0]?.requestError,
  };
}
