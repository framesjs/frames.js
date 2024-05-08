/* eslint-disable no-console -- provide feedback */
/* eslint-disable no-alert -- provide feedback */
"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Frame, FrameButton, TransactionTargetResponse } from "frames.js";
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
  FrameStackRequestError,
  GetFrameResult,
  FrameStackMessage,
  FarcasterFrameContext,
  FramesStackItem,
} from "@frames.js/render";
import type { ParseResult } from "frames.js/frame-parsers";

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

function computeDurationInSeconds(start: Date, end: Date): number {
  return Number(((end.getTime() - start.getTime()) / 1000).toFixed(2));
}

type FrameActions =
  | {
      action: "LOAD";
      item: FrameStackPending;
    }
  | {
      action: "REQUEST_ERROR";
      pendingItem: FrameStackPending;
      item: FrameStackRequestError;
    }
  | {
      action: "DONE";
      pendingItem: FrameStackPending;
      item: FramesStackItem;
    }
  | { action: "CLEAR" }
  | {
      action: "RESET_INITIAL_FRAME";
      resultOrFrame: ParseResult | Frame;
      homeframeUrl: string | null | undefined;
    };

function isParseResult(result: Frame | ParseResult): result is ParseResult {
  return "status" in result;
}

function framesStackReducer(
  state: FramesStack,
  action: FrameActions
): FramesStack {
  switch (action.action) {
    case "LOAD":
      return [action.item, ...state];
    case "DONE": {
      const index = state.findIndex(
        (item) => item.timestamp === action.pendingItem.timestamp
      );

      if (index === -1) {
        return state;
      }

      state[index] = action.item;

      return state.slice();
    }
    case "RESET_INITIAL_FRAME": {
      const originalInitialFrame = state[0];
      const frame = isParseResult(action.resultOrFrame)
        ? action.resultOrFrame.frame
        : action.resultOrFrame;
      // initial frame is always set with done state
      const shouldReset =
        !originalInitialFrame ||
        (originalInitialFrame.status === "done" &&
          originalInitialFrame.frame.frame !== frame);

      if (shouldReset) {
        return [
          {
            method: "GET",
            responseStatus: 200,
            timestamp: new Date(),
            url: action.homeframeUrl ?? "",
            speed: 0,
            frame: isParseResult(action.resultOrFrame)
              ? action.resultOrFrame
              : {
                  status: "success",
                  reports: {},
                  frame: action.resultOrFrame,
                },
            status: "done",
          },
        ];
      }

      return state;
    }
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

export function useAction<
  SignerStorageType = object,
  FrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  FrameContextType extends FrameContext = FarcasterFrameContext
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
}: UseFrameReturn<
  SignerStorageType,
  FrameActionBodyType,
  FrameContextType
>): FrameState {
  const [inputText, setInputText] = useState("");
  const reducerInitArg = useMemo(
    () => ({ frame, homeframeUrl }),
    [frame, homeframeUrl]
  );
  const [framesStack, dispatch] = useReducer(
    framesStackReducer,
    reducerInitArg,
    (args): FramesStack => {
      if (args.frame) {
        return [
          {
            method: "GET",
            responseStatus: 200,
            timestamp: new Date(),
            url: args.homeframeUrl ?? "",
            speed: 0,
            frame: isParseResult(args.frame)
              ? args.frame
              : {
                  reports: {},
                  frame: args.frame,
                  status: "success",
                },
            status: "done",
          },
        ];
      } else if (args.homeframeUrl) {
        // prevent flash of empty if will shortly set this in first rerender
        // this is then handled by fetchFrame having second argument set to true so the stack is cleared
        return [
          {
            method: "GET",
            timestamp: new Date(),
            url: args.homeframeUrl,
            status: "pending",
          },
        ];
      }

      return [];
    }
  );

  async function fetchFrame(
    frameRequest: FrameRequest,
    shouldClear = false
  ): Promise<void> {
    const startTime = new Date();

    if (shouldClear) {
      // this clears initial frame since that is loading from SSR since we aren't able to finish it.
      // not an ideal solution
      dispatch({ action: "CLEAR" });
    }

    if (frameRequest.method === "GET") {
      const frameStackPendingItem: FrameStackPending = {
        method: "GET" as const,
        timestamp: startTime,
        url: frameRequest.url,
        status: "pending",
      };
      dispatch({ action: "LOAD", item: frameStackPendingItem });

      const searchParams = new URLSearchParams({
        url: frameRequest.url,
        specification,
      });
      const proxiedUrl = `${frameGetProxy}?${searchParams.toString()}`;

      let response;
      let endTime = new Date();
      try {
        response = await fetch(proxiedUrl).finally(() => {
          endTime = new Date();
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch frame: ${response.statusText}`);
        }

        const loadedFrame = (await response.json()) as GetFrameResult;

        dispatch({
          action: "DONE",
          pendingItem: frameStackPendingItem,
          item: {
            ...frameStackPendingItem,
            status: "done",
            frame: loadedFrame,
            speed: computeDurationInSeconds(startTime, endTime),
            responseStatus: response.status,
          },
        });
      } catch (err) {
        const stackItem: FrameStackRequestError = {
          ...frameStackPendingItem,
          url: frameRequest.url,
          responseStatus: response?.status ?? 500,
          requestError: err,
          speed: computeDurationInSeconds(startTime, endTime),
          status: "requestError",
        };

        dispatch({
          action: "REQUEST_ERROR",
          pendingItem: frameStackPendingItem,
          item: stackItem,
        });

        console.error(err);
      }
    } else {
      const searchParams = new URLSearchParams(
        frameRequest.request.searchParams
      );

      searchParams.set("specification", specification);

      const frameStackPendingItem: FrameStackPending = {
        method: "POST" as const,
        request: {
          searchParams,
          body: frameRequest.request.body,
        },
        timestamp: startTime,
        url: frameRequest.url,
        status: "pending",
        sourceFrame: frameRequest.sourceFrame,
      };

      dispatch({ action: "LOAD", item: frameStackPendingItem });

      const proxiedUrl = `${frameActionProxy}?${frameStackPendingItem.request.searchParams.toString()}`;

      let response;
      let endTime = new Date();

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
        }).finally(() => {
          endTime = new Date();
        });

        console.log("response", response.status);

        if (!response.ok) {
          if (response.status >= 500)
            throw new Error(`Failed to fetch frame: ${response.statusText}`);
        }

        const responseData = (await response.json()) as
          | GetFrameResult
          | { location: string }
          | { message: string }
          | { type: "frame"; frameUrl: string };

        console.log("responseData", responseData);

        if ("location" in responseData) {
          const location = responseData.location;

          if (window.confirm(`You are about to be redirected to ${location}`)) {
            window.open(location, "_blank")?.focus();
          }

          return;
        } else if ("message" in responseData) {
          const stackItem: FrameStackMessage = {
            ...frameStackPendingItem,
            responseStatus: response.status,
            speed: computeDurationInSeconds(startTime, endTime),
            status: "message",
            type: "info",
            message: responseData.message,
          };

          dispatch({
            action: "DONE",
            pendingItem: frameStackPendingItem,
            item: stackItem,
          });
          return;
        } else if ("frameUrl" in responseData) {
          const stackItem: FrameStackMessage = {
            ...frameStackPendingItem,
            responseStatus: response.status,
            speed: computeDurationInSeconds(startTime, endTime),
            status: "message",
            type: "info",
            message: "Loading frame from frameUrl.",
          };

          dispatch({
            action: "DONE",
            pendingItem: frameStackPendingItem,
            item: stackItem,
          });

          onButtonPress(
            { image: "", buttons: [], version: "vNext" },
            {
              action: "post",
              label: "action",
              target: responseData.frameUrl,
            },
            1
          );

          return;
        }

        dispatch({
          action: "DONE",
          pendingItem: frameStackPendingItem,
          item: {
            ...frameStackPendingItem,
            frame: responseData,
            status: "done",
            speed: computeDurationInSeconds(startTime, endTime),
            responseStatus: response.status,
          },
        });
      } catch (err) {
        const stackItem: FrameStackRequestError = {
          ...frameStackPendingItem,
          responseStatus: response?.status ?? 500,
          requestError: err,
          speed: computeDurationInSeconds(startTime, endTime),
          status: "requestError",
        };

        dispatch({
          action: "REQUEST_ERROR",
          pendingItem: frameStackPendingItem,
          item: stackItem,
        });

        console.error(err);
      }
    }
  }

  const fetchFrameRef = useRef(fetchFrame);
  fetchFrameRef.current = fetchFrame;

  // Load initial frame if not defined
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
  }, [frame, homeframeUrl]);

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
              currentFrame,
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
              fetchFrameOverride,
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
            currentFrame,
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
    dangerousSkipSigning: isDangerousSkipSigning,
    target,
    state,
    transactionId,
    fetchFrameOverride,
  }: {
    currentFrame: Frame;
    frameButton: FrameButton;
    buttonIndex: number;
    postInputText: string | undefined;
    state?: string;
    dangerousSkipSigning?: boolean;
    transactionId?: `0x${string}`;
    target: string;
    fetchFrameOverride?: typeof fetchFrame;
  }): Promise<void> {
    const currentFrameStackItem = framesStack[0];

    if (!isDangerousSkipSigning && !signerState.hasSigner) {
      console.error("frames.js: missing required auth state");
      return;
    }
    if (!currentFrameStackItem || !homeframeUrl) {
      console.error("frames.js: missing required value for post");
      return;
    }

    const frameSignatureContext = {
      inputText: postInputText,
      signer: signerState.signer ?? null,
      frameContext,
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

    const _fetchFrame = fetchFrameOverride ?? fetchFrame;

    await _fetchFrame({
      // post_url stuff
      url: searchParams.get("postUrl") ?? "/",
      method: "POST",
      request: {
        searchParams,
        body,
      },
      sourceFrame: currentFrame,
    });
  }

  async function onTransactionRequest({
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

    const { searchParams, body } = await signerState.signFrameAction({
      inputText: postInputText,
      signer: signerState.signer ?? null,
      frameContext,
      address: connectedAddress,
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
      const transactionResponse =
        (await response.json()) as TransactionTargetResponse;
      return transactionResponse;
    } catch {
      throw new Error(
        `frames.js: Could not fetch transaction data from "${searchParams.get(
          "postUrl"
        )}"`
      );
    }
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
