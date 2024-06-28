/* eslint-disable no-console -- provide feedback to console */
import type { TransactionTargetResponse } from "frames.js";
import type {
  FrameGETRequest,
  FramePOSTRequest,
  FrameRequest,
  FrameStackGetPending,
  FrameStackMessage,
  FrameStackPending,
  FrameStackPostPending,
  GetFrameResult,
  UseFetchFrameOptions,
} from "./types";
import type { FarcasterFrameContext } from "./farcaster";
import { isParseResult } from "./use-frame-stack";

function computeDurationInSeconds(start: Date, end: Date): number {
  return Number(((end.getTime() - start.getTime()) / 1000).toFixed(2));
}

type FetchFrameFn = (
  request: FrameRequest,
  shouldClear?: boolean
) => Promise<void>;

function defaultErrorHandler(error: Error): void {
  console.error(error);
}

export function useFetchFrame({
  stackDispatch,
  specification,
  frameActionProxy,
  frameGetProxy,
  extraButtonRequestPayload,
  signFrameAction,
  onTransaction,
  onSignature,
  homeframeUrl,
  onError = defaultErrorHandler,
  fetchFn,
  onRedirect,
}: UseFetchFrameOptions): FetchFrameFn {
  async function handleFailedResponse({
    response,
    startTime,
    endTime,
    frameStackPendingItem,
  }: {
    startTime: Date;
    endTime: Date;
    response: Response;
    frameStackPendingItem: FrameStackPending;
  }): Promise<void> {
    if (response.ok) {
      throw new TypeError(
        "handleFailedResponse called with a successful response"
      );
    }

    const responseBody = await getResponseBody(response);

    if (response.status >= 400 && response.status < 500) {
      // handle error message only for actions (POST method)
      if (
        frameStackPendingItem.request.method === "POST" &&
        responseBody &&
        typeof responseBody === "object" &&
        "message" in responseBody &&
        typeof responseBody.message === "string"
      ) {
        const stackItem: FrameStackMessage = {
          ...(frameStackPendingItem as FrameStackPostPending),
          responseStatus: response.status,
          response: response.clone(),
          speed: computeDurationInSeconds(startTime, endTime),
          status: "message",
          type: "error",
          message: responseBody.message,
          responseBody,
        };

        stackDispatch({
          action: "DONE",
          pendingItem: frameStackPendingItem,
          item: stackItem,
        });

        return;
      }

      console.error(
        `frames.js: The server returned an error but it does not contain message property. Status code: ${response.status}`,
        responseBody
      );
    }

    const requestError = new Error(
      `The server returned an error but it does not contain message property. Status code: ${response.status}`
    );

    pushRequestErrorToStack({
      frameStackPendingItem,
      requestError,
      responseStatus: response.status,
      startTime,
      endTime,
      responseBody,
      response,
    });
  }

  function pushRequestErrorToStack({
    frameStackPendingItem,
    requestError,
    responseStatus,
    startTime,
    endTime,
    responseBody,
    response,
  }: {
    frameStackPendingItem: FrameStackPending;
    requestError: Error;
    responseStatus: number;
    startTime: Date;
    endTime: Date;
    responseBody: unknown;
    response: Response | null;
  }): void {
    stackDispatch({
      action: "REQUEST_ERROR",
      pendingItem: frameStackPendingItem,
      item: {
        request: frameStackPendingItem.request,
        requestDetails: frameStackPendingItem.requestDetails,
        timestamp: frameStackPendingItem.timestamp,
        url: frameStackPendingItem.url,
        response: response?.clone() ?? null,
        responseStatus,
        requestError,
        speed: computeDurationInSeconds(startTime, endTime),
        status: "requestError",
        responseBody,
      },
    });

    onError(requestError);
  }

  async function fetchGETRequest(
    request: FrameGETRequest,
    shouldClear: boolean
  ): Promise<void> {
    const startTime = new Date();

    if (shouldClear) {
      // this clears initial frame since that is loading from SSR since we aren't able to finish it.
      // not an ideal solution
      stackDispatch({ action: "CLEAR" });
    }

    const frameStackPendingItem: FrameStackGetPending = {
      method: "GET",
      timestamp: startTime,
      request,
      status: "pending",
      requestDetails: {},
      url: request.url,
    };

    stackDispatch({ action: "LOAD", item: frameStackPendingItem });

    const searchParams = new URLSearchParams({
      url: request.url,
      specification,
    });
    const proxiedUrl = `${frameGetProxy}?${searchParams.toString()}`;

    const response = await tryCall(fetchFn(proxiedUrl, { method: "GET" }));
    const endTime = new Date();

    if (response instanceof Response) {
      if (!response.ok) {
        await handleFailedResponse({
          response,
          startTime,
          endTime,
          frameStackPendingItem,
        });

        return;
      }

      const loadedFrame = (await response.clone().json()) as GetFrameResult;

      stackDispatch({
        action: "DONE",
        pendingItem: frameStackPendingItem,
        item: {
          ...frameStackPendingItem,
          status: "done",
          frameResult: loadedFrame,
          speed: computeDurationInSeconds(startTime, endTime),
          response: response.clone(),
          responseStatus: response.status,
          responseBody: loadedFrame,
        },
      });

      return;
    }

    pushRequestErrorToStack({
      frameStackPendingItem,
      endTime,
      startTime,
      responseBody: "none",
      responseStatus: 500,
      requestError: response,
      response: null,
    });
  }

  async function fetchPOSTRequest(
    request: FramePOSTRequest,
    options?: { pendingFrameStackItem: FrameStackPending; startTime: Date },
    shouldClear?: boolean
  ): Promise<void> {
    // Transacting address is not included in post action
    const { address: _, ...requiredFrameContext } = request
      .signerStateActionContext.frameContext as FarcasterFrameContext;

    const startTime = options?.startTime || new Date();
    const frameStackPendingItem: FrameStackPending = {
      method: "POST",
      request,
      requestDetails: {
        // this will be filled afterwards
      },
      timestamp: startTime,
      status: "pending",
      url:
        request.frameButton.target ||
        request.sourceFrame.postUrl ||
        homeframeUrl ||
        "", // this will be also filled after action is signed
    };

    if (shouldClear) {
      stackDispatch({ action: "CLEAR" });
    }

    // if there are no options passed there is no preflight happening (for example in case of transactions we first fetch transaction data and then post it to frame)
    // in that case options are passed so we can manipulate the pending item
    if (!options) {
      stackDispatch({ action: "LOAD", item: frameStackPendingItem });
    }

    // get rid of address from request.signerStateActionContext.frameContext and pass that to sign frame action
    const signedDataOrError = await tryCall(
      signFrameAction(request.isDangerousSkipSigning, {
        ...request.signerStateActionContext,
        frameContext: requiredFrameContext,
      })
    );

    if (signedDataOrError instanceof Error) {
      pushRequestErrorToStack({
        endTime: new Date(),
        frameStackPendingItem,
        responseBody: "none",
        responseStatus: 500,
        startTime,
        requestError: signedDataOrError,
        response: null,
      });

      return;
    }

    const { body, searchParams } = signedDataOrError;

    stackDispatch({
      action: "ADD_REQUEST_DETAILS",
      requestDetails: {
        body,
        searchParams,
      },
      url: searchParams.get("postUrl") ?? "",
      pendingItem: frameStackPendingItem,
    });

    searchParams.set("specification", specification);

    const proxiedUrl = `${frameActionProxy}?${searchParams.toString()}`;

    const response = await tryCall(
      fetchFn(proxiedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...extraButtonRequestPayload,
          ...body,
        }),
      })
    );
    const endTime = new Date();

    async function handleRedirect(
      res: Response,
      pendingItem: FrameStackPostPending
    ): Promise<void> {
      // check that location is proper fully formatted url
      try {
        let location = res.headers.get("location");

        if (!location) {
          const responseData = (await res.clone().json()) as
            | Record<string, unknown>
            | string
            | null
            | number;

          if (
            responseData &&
            typeof responseData === "object" &&
            "location" in responseData &&
            typeof responseData.location === "string"
          ) {
            location = responseData.location;
          }
        }

        if (!location) {
          throw new Error(
            `Response data does not contain 'location' key and no 'location' header is found.`
          );
        }

        // check the URL is valid
        const locationUrl = new URL(location);

        onRedirect(locationUrl);

        stackDispatch({
          action: "DONE_REDIRECT",
          pendingItem,
          item: {
            ...pendingItem,
            location,
            response: res.clone(),
            responseBody: await res.clone().text(),
            responseStatus: res.status,
            status: "doneRedirect",
            speed: computeDurationInSeconds(startTime, endTime),
          },
        });
      } catch (e) {
        stackDispatch({
          action: "REQUEST_ERROR",
          pendingItem: frameStackPendingItem,
          item: {
            ...frameStackPendingItem,
            status: "requestError",
            requestError:
              e instanceof Error
                ? e
                : new Error(
                    "Response body must be a json with 'location' property or response 'Location' header must contain fully qualified URL."
                  ),
            response: res.clone(),
            responseStatus: res.status,
            responseBody: await res.text(),
            speed: computeDurationInSeconds(startTime, endTime),
          },
        });
      }
    }

    if (response instanceof Response) {
      // handle valid redirect
      if (response.status === 302) {
        await handleRedirect(response, frameStackPendingItem);

        return;
      }

      if (!response.ok) {
        await handleFailedResponse({
          response,
          startTime,
          endTime,
          frameStackPendingItem,
        });

        return;
      }

      const responseData = (await response.clone().json()) as
        | GetFrameResult
        | { message: string }
        | { type: "frame"; frameUrl: string };

      // cast action message response
      if ("message" in responseData) {
        stackDispatch({
          action: "DONE",
          pendingItem: frameStackPendingItem,
          item: {
            ...frameStackPendingItem,
            status: "message",
            message: responseData.message,
            type: "info",
            response: response.clone(),
            responseStatus: response.status,
            speed: computeDurationInSeconds(startTime, endTime),
            responseBody: responseData,
          },
        });

        return;
      }

      // cast action frame response, fetch the frame
      if ("frameUrl" in responseData) {
        await fetchPOSTRequest(
          {
            // actions don't have source frame, fake it
            sourceFrame: {
              image: "",
              version: "vNext",
            },
            frameButton: {
              action: "post",
              label: "action",
              target: responseData.frameUrl,
            },
            isDangerousSkipSigning: request.isDangerousSkipSigning,
            method: "POST",
            signerStateActionContext: {
              ...request.signerStateActionContext,
              buttonIndex: 1,
              frameButton: {
                action: "post",
                label: "action",
                target: responseData.frameUrl,
              },
              target: responseData.frameUrl,
            },
          },
          {
            pendingFrameStackItem: frameStackPendingItem,
            startTime,
          }
        );

        return;
      }

      if (!isParseResult(responseData)) {
        const error = new Error(`The server returned an unexpected response.`);
        console.error(error);

        pushRequestErrorToStack({
          endTime,
          frameStackPendingItem,
          responseBody: responseData,
          responseStatus: 500,
          startTime,
          requestError: error,
          response,
        });

        return;
      }

      stackDispatch({
        action: "DONE",
        pendingItem: options?.pendingFrameStackItem ?? frameStackPendingItem,
        item: {
          ...(options?.pendingFrameStackItem ?? frameStackPendingItem),
          // update url to the one used to send the request, this handles transaction flow where pending item is created for transaction data request
          url: frameStackPendingItem.url,
          frameResult: responseData,
          status: "done",
          speed: computeDurationInSeconds(startTime, endTime),
          response: response.clone(),
          responseStatus: response.status,
          responseBody: responseData,
        },
      });

      return;
    }

    pushRequestErrorToStack({
      endTime,
      frameStackPendingItem,
      responseBody: "none",
      responseStatus: 500,
      startTime,
      requestError: response,
      response: new Response(response.message, {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      }),
    });
  }

  async function fetchTransactionRequest(
    request: FramePOSTRequest,
    shouldClear?: boolean
  ): Promise<void> {
    const button = request.frameButton;

    if (button.action !== "tx") {
      throw new Error("Invalid frame button action, tx expected");
    }

    if (shouldClear) {
      stackDispatch({ action: "CLEAR" });
    }

    const startTime = new Date();
    const frameStackPendingItem: FrameStackPending = {
      method: "POST",
      timestamp: startTime,
      status: "pending",
      request,
      // will be filled afterwards
      requestDetails: {},
      url:
        request.frameButton.target ||
        request.sourceFrame.postUrl ||
        homeframeUrl ||
        "",
    };

    stackDispatch({ action: "LOAD", item: frameStackPendingItem });

    const signedTransactionDataActionOrError = await tryCall(
      signFrameAction(
        // for transaction data we always use signer, so skip signing is false here
        false,
        request.signerStateActionContext
      )
    );

    if (signedTransactionDataActionOrError instanceof Error) {
      pushRequestErrorToStack({
        endTime: new Date(),
        frameStackPendingItem,
        responseBody: "none",
        responseStatus: 500,
        startTime,
        requestError: signedTransactionDataActionOrError,
        response: null,
      });

      return;
    }

    stackDispatch({
      action: "ADD_REQUEST_DETAILS",
      requestDetails: {
        body: signedTransactionDataActionOrError.body,
        searchParams: signedTransactionDataActionOrError.searchParams,
      },
      url: signedTransactionDataActionOrError.searchParams.get("postUrl") ?? "",
      pendingItem: frameStackPendingItem,
    });

    signedTransactionDataActionOrError.searchParams.set(
      "specification",
      specification
    );

    // fetch transaction data first
    const transactionDataProxiedUrl = `${frameActionProxy}?${signedTransactionDataActionOrError.searchParams.toString()}`;

    const transactionDataResponse = await tryCall(
      fetchFn(transactionDataProxiedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...extraButtonRequestPayload,
          ...signedTransactionDataActionOrError.body,
        }),
      })
    );
    const endTime = new Date();

    if (!(transactionDataResponse instanceof Response)) {
      pushRequestErrorToStack({
        endTime,
        frameStackPendingItem,
        responseBody: "none",
        responseStatus: 500,
        startTime,
        requestError: transactionDataResponse,
        response: null,
      });

      return;
    }

    if (!transactionDataResponse.ok) {
      await handleFailedResponse({
        response: transactionDataResponse,
        startTime,
        endTime,
        frameStackPendingItem,
      });

      return;
    }

    const transactionData =
      (await transactionDataResponse.json()) as TransactionTargetResponse;

    let transactionIdOrError: `0x${string}` | Error;

    // get transaction id or signature id from transaction data
    if (transactionData.method === "eth_sendTransaction") {
      transactionIdOrError = await tryCall(
        onTransaction({
          frame: request.sourceFrame,
          frameButton: request.frameButton,
          transactionData,
        }).then((transactionId) => {
          if (!transactionId) {
            return new Error("onTransaction did not return transaction id");
          }

          return transactionId;
        })
      );
    } else {
      transactionIdOrError = await tryCall(
        onSignature({
          frame: request.sourceFrame,
          frameButton: request.frameButton,
          signatureData: transactionData,
        }).then((signatureHash) => {
          if (!signatureHash) {
            return new Error("onSignature did not return signature");
          }

          return signatureHash;
        })
      );
    }

    if (transactionIdOrError instanceof Error) {
      pushRequestErrorToStack({
        endTime,
        frameStackPendingItem,
        responseBody: "none",
        responseStatus: 500,
        startTime,
        requestError: transactionIdOrError,
        response: null,
      });

      return;
    }

    await fetchPOSTRequest(
      {
        ...request,
        signerStateActionContext: {
          ...request.signerStateActionContext,
          // include transactionId in payload
          transactionId: transactionIdOrError,
          // override target so the the request is sent to proper endpoint
          target:
            button.post_url || request.sourceFrame.postUrl || button.target,
        },
      },
      {
        pendingFrameStackItem: frameStackPendingItem,
        startTime,
      }
    );
  }

  return (request, shouldClear = false) => {
    if (request.method === "GET") {
      return fetchGETRequest(request, shouldClear);
    }

    if (request.frameButton.action === "tx") {
      return fetchTransactionRequest(request, shouldClear);
    }

    return fetchPOSTRequest(request, undefined, shouldClear);
  };
}

async function tryCall<TResult>(
  promise: Promise<TResult>
): Promise<TResult | Error> {
  return promise.catch((e) => {
    if (e instanceof Error) {
      return e;
    }

    console.error(e);
    return new TypeError("Unexpected error, check the console for details");
  });
}

function getResponseBody(response: Response): Promise<unknown> {
  if (response.headers.get("content-type")?.includes("/json")) {
    return response.clone().json();
  }

  return response.clone().text();
}
