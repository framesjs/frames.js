/* eslint-disable @typescript-eslint/require-await -- we expect async functions */
/* eslint-disable no-console -- provide feedback */
/* eslint-disable no-alert -- provide feedback */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  FrameActionPayload,
  FrameButton,
  TransactionTargetResponse,
  getFrame,
} from "frames.js";
import { getFarcasterTime } from "@farcaster/core";
import type {
  FrameState,
  OnMintArgs,
  FrameContext,
  SignerStateInstance,
  FrameActionBodyPayload,
  FramesStack,
  FrameStackPending,
  FrameRequest,
  UseFrameReturn,
  OnTransactionArgs,
} from "./types";

function onMintFallback({ target }: OnMintArgs): void {
  window.alert(`Mint requested: ${target}`);
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
      postType: frameButton.action,
      postUrl: target ?? "",
    });

    return {
      searchParams,
      body: {
        untrustedData: {
          url,
          timestamp: getFarcasterTime()._unsafeUnwrap(),
          network: 1,
          buttonIndex,
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

async function onTransactionFallback({
  transactionData,
}: OnTransactionArgs): Promise<null> {
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
  B extends FrameActionBodyPayload = FrameActionPayload,
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
  const initialFrame = useMemo(() => {
    if (frame) {
      return { frame, errors: null };
    }
    return undefined;
  }, [frame]);

  const [framesStack, setFramesStack] = useState<FramesStack>(
    initialFrame
      ? [
          {
            method: "GET",
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
          method: "GET" as const,
          timestamp: new Date(),
          url: homeframeUrl,
        }
      : null
  );

  async function fetchFrame(frameRequest: FrameRequest): Promise<void> {
    if (frameRequest.method === "GET") {
      const tstart = new Date();

      const frameStackBase = {
        request: {},
        method: "GET" as const,
        timestamp: tstart,
        url: frameRequest.url,
      };
      setIsLoading(frameStackBase);

      let requestError: unknown = null;
      let newFrame: ReturnType<typeof getFrame> | null = null;
      const searchParams = new URLSearchParams({ url: frameRequest.url });
      const proxiedUrl = `${frameGetProxy}?${searchParams.toString()}`;

      let stackItem: FramesStack[number];
      let response;
      try {
        response = await fetch(proxiedUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch frame: ${response.statusText}`);
        }
        
        newFrame = (await response.json()) as ReturnType<typeof getFrame>;
        const tend = new Date();

        stackItem = {
          ...frameStackBase,
          frame: newFrame.frame,
          frameValidationErrors: newFrame.errors,
          speed: Number(
            ((tend.getTime() - tstart.getTime()) / 1000).toFixed(2)
          ),
          responseStatus: response.status,
          isValid: Object.keys(newFrame.errors ?? {}).length === 0,
        };
      } catch (err) {
        const tend = new Date();

        stackItem = {
          ...frameStackBase,
          url: frameRequest.url,
          responseStatus: response?.status ?? 500,
          requestError,
          speed: Number(
            ((tend.getTime() - tstart.getTime()) / 1000).toFixed(2)
          ),
        };

        requestError = err;
      }
      setFramesStack((v) => [stackItem, ...v]);
    } else {
      const tstart = new Date();
      const frameStackBase = {
        method: "POST" as const,
        request: {
          searchParams: frameRequest.request.searchParams,
          body: frameRequest.request.body,
        },
        timestamp: tstart,
        url: frameRequest.url,
      };
      setIsLoading(frameStackBase);
      let stackItem: FramesStack[number] | undefined;
      const proxiedUrl = `${frameActionProxy}?${frameRequest.request.searchParams.toString()}`;

      let response;
      try {
        response = await fetch(proxiedUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...extraButtonRequestPayload,
            ...frameRequest.request.body,
          }),
        });
        const dataRes = (await response.json()) as
          | ReturnType<typeof getFrame>
          | { location: string };
        const tend = new Date();

        if ("location" in dataRes) {
          const location = dataRes.location;

          if (window.confirm(`You are about to be redirected to ${location}`)) {
            window.open(location, "_blank")?.focus();
          }
        } else {
          stackItem = {
            ...frameStackBase,
            responseStatus: response.status,
            speed: Number(
              ((tend.getTime() - tstart.getTime()) / 1000).toFixed(2)
            ),
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
          speed: Number(
            ((tend.getTime() - tstart.getTime()) / 1000).toFixed(2)
          ),
        };

        console.error(err);
      }

      setFramesStack((v) => (stackItem ? [stackItem, ...v] : v));
    }
    setIsLoading(null);
  }

  const fetchFrameRef = useRef(fetchFrame);
  fetchFrameRef.current = fetchFrame;

  // Load initial frame if not defined
  useEffect(() => {
    if (!initialFrame && homeframeUrl) {
      fetchFrameRef
        .current({
          url: homeframeUrl,
          method: "GET",
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }, [initialFrame, homeframeUrl]);

  function getCurrentFrame(): ReturnType<typeof getFrame>["frame"] | null {
    const [latestFrame] = framesStack;

    return latestFrame && "frame" in latestFrame ? latestFrame.frame : null;
  }

  function isCurrentFrameValid(): boolean | undefined {
    const [latestFrame] = framesStack;

    return latestFrame && "frameValidationErrors" in latestFrame
      ? Object.keys(latestFrame.frameValidationErrors ?? {}).length === 0
      : undefined;
  }

  function getCurrentFrameValidationErrors():
    | Record<string, string[]>
    | null
    | undefined {
    const [latestFrame] = framesStack;

    return latestFrame && "frameValidationErrors" in latestFrame
      ? latestFrame.frameValidationErrors
      : null;
  }

  function getCurrentFrameRequestError(): unknown {
    const [latestFrame] = framesStack;

    return latestFrame && "requestError" in latestFrame
      ? latestFrame.requestError
      : null;
  }

  async function onButtonPress(
    frameButton: FrameButton,
    index: number
  ): Promise<void> {
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
        const transactionData = await onTransactionRequest({
          frameButton,
          target: frameButton.target,
          buttonIndex: index + 1,
          postInputText:
            currentFrame.inputText !== undefined ? inputText : undefined,
          state: currentFrame.state,
        });
        if (transactionData) {
          const transactionId = await onTransaction({
            frame: currentFrame,
            frameButton,
            transactionData,
          });

          if (transactionId) {
            await onPostButton({
              frameButton,
              target:
                frameButton.post_url ||
                currentFrame.postUrl ||
                frameButton.target, // transaction_ids must be posted to post_url or button post_url
              buttonIndex: index + 1,
              postInputText:
                currentFrame.inputText !== undefined ? inputText : undefined,
              state: currentFrame.state,
              transactionId,
            });
          }
        }
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
            frameButton,
            /** https://docs.farcaster.xyz/reference/frames/spec#handling-clicks
    
            POST the packet to fc:frame:button:$idx:action:target if present
            POST the packet to fc:frame:post_url if target was not present.
            POST the packet to or the frame's embed URL if neither target nor action were present.
            */
            target,
            dangerousSkipSigning,
            buttonIndex: index + 1,
            postInputText:
              currentFrame.inputText !== undefined ? inputText : undefined,
            state: currentFrame.state,
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
    buttonIndex,
    postInputText,
    frameButton,
    dangerousSkipSigning: isDangerousSkipSigning,
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
  }): Promise<void> {
    const currentFrame = getCurrentFrame();

    if (!isDangerousSkipSigning && !signerState.hasSigner) {
      console.error("frames.js: missing required auth state");
      return;
    }
    if (!currentFrame || !homeframeUrl) {
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
      target,
      frameButton,
      buttonIndex,
      state,
      transactionId,
    };
    const { searchParams, body } = isDangerousSkipSigning
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
  }

  async function onTransactionRequest({
    buttonIndex, postInputText, frameButton, target, state,
  }: {
    frameButton: FrameButton;
    buttonIndex: number;
    postInputText: string | undefined;
    state?: string;
    target: string;
  }): Promise<TransactionTargetResponse | undefined> {
    // Send post request to get calldata
    const currentFrame = getCurrentFrame();

    if (!dangerousSkipSigning && !signerState.hasSigner) {
      console.error("frames.js: missing required auth state");
      return;
    }
    if (!currentFrame || !homeframeUrl) {
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
      frameButton,
      buttonIndex,
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
      const transactionResponse = (await response.json()) as TransactionTargetResponse;
      return transactionResponse;
    } catch {
      throw new Error(
        `frames.js: Could not fetch transaction data from "${searchParams.get("postUrl")}"`
      );
    }
  }

  return {
    isLoading,
    inputText,
    setInputText,
    clearFrameStack: () => {
      setFramesStack([]);
    },
    onButtonPress,
    fetchFrame,
    homeframeUrl,
    framesStack,
    frame: getCurrentFrame() ?? null,
    isFrameValid: isCurrentFrameValid(),
    frameValidationErrors: getCurrentFrameValidationErrors(),
    error: getCurrentFrameRequestError(),
  };
}
