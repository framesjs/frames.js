/* eslint-disable no-alert -- provide feedback */
/* eslint-disable no-console -- provide feedback to console */
import type {
  SupportedParsingSpecification,
  TransactionTargetResponse,
} from "frames.js";
import type {
  FrameGETRequest,
  FramePOSTRequest,
  FrameReducerActions,
  FrameRequest,
  FrameStackGetPending,
  FrameStackMessage,
  FrameStackPending,
  FrameStackPostPending,
  GetFrameResult,
  OnTransactionFunc,
  SignerStateActionContext,
  SignerStateInstance,
} from "./types";
import type { FarcasterFrameContext } from "./farcaster";
import { isParseResult } from "./use-frame-stack";

function computeDurationInSeconds(start: Date, end: Date): number {
  return Number(((end.getTime() - start.getTime()) / 1000).toFixed(2));
}

type UseFetchFrameOptions = {
  stackDispatch: React.Dispatch<FrameReducerActions>;
  specification: SupportedParsingSpecification;
  /**
   * URL or path to the frame proxy handling GET requests.
   */
  frameGetProxy: string;
  /**
   * URL or path to the frame proxy handling POST requests.
   */
  frameActionProxy: string;
  /**
   * Extra payload to be sent with the POST request.
   */
  extraButtonRequestPayload?: Record<string, unknown>;
  signFrameAction: (
    isDangerousSkipSigning: boolean,
    actionContext: SignerStateActionContext<any, any>
  ) => ReturnType<SignerStateInstance["signFrameAction"]>;
  onTransaction: OnTransactionFunc;
  homeframeUrl: string | undefined | null;
};

type FetchFrameFn = (
  request: FrameRequest,
  shouldClear?: boolean
) => Promise<void>;

export function useFetchFrame({
  stackDispatch,
  specification,
  frameActionProxy,
  frameGetProxy,
  extraButtonRequestPayload,
  signFrameAction,
  onTransaction,
  homeframeUrl,
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
          speed: computeDurationInSeconds(startTime, endTime),
          status: "message",
          type: "error",
          message: responseBody.message,
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

    pushRequestErrorToStack({
      frameStackPendingItem,
      requestError: new Error(
        `The server returned an error but it does not contain message property. Status code: ${response.status}`
      ),
      responseStatus: response.status,
      startTime,
      endTime,
      responseBody,
    });
  }

  function pushRequestErrorToStack({
    frameStackPendingItem,
    requestError,
    responseStatus,
    startTime,
    endTime,
    responseBody,
  }: {
    frameStackPendingItem: FrameStackPending;
    requestError?: Error;
    responseStatus: number;
    startTime: Date;
    endTime: Date;
    responseBody: unknown;
  }): void {
    stackDispatch({
      action: "REQUEST_ERROR",
      pendingItem: frameStackPendingItem,
      item: {
        request: frameStackPendingItem.request,
        requestDetails: frameStackPendingItem.requestDetails,
        timestamp: frameStackPendingItem.timestamp,
        url: frameStackPendingItem.url,
        responseStatus,
        requestError:
          requestError ?? new Error(`Failed to fetch frame: ${responseStatus}`),
        speed: computeDurationInSeconds(startTime, endTime),
        status: "requestError",
        responseBody,
      },
    });
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

    const response = await fetchRequest(proxiedUrl, { method: "GET" });
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

      const loadedFrame = (await response.json()) as GetFrameResult;

      stackDispatch({
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

      return;
    }

    pushRequestErrorToStack({
      frameStackPendingItem,
      endTime,
      startTime,
      responseBody: "none",
      responseStatus: 500,
      requestError: response,
    });

    console.error(response);
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
    const signedDataOrError = await signFrameAction(
      request.isDangerousSkipSigning,
      {
        ...request.signerStateActionContext,
        frameContext: requiredFrameContext,
      }
    ).catch((e) => {
      if (e instanceof Error) {
        return e;
      }

      console.error(e);
      return new Error(
        "Unexpected error thrown by signFrameAction, see the console for details"
      );
    });

    if (signedDataOrError instanceof Error) {
      pushRequestErrorToStack({
        endTime: new Date(),
        frameStackPendingItem,
        responseBody: "none",
        responseStatus: 500,
        startTime,
        requestError: signedDataOrError,
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

    const response = await fetchRequest(proxiedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...extraButtonRequestPayload,
        ...body,
      }),
    });
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

      const responseData = (await response.json()) as
        | GetFrameResult
        | { location: string }
        | { message: string }
        | { type: "frame"; frameUrl: string };

      if ("location" in responseData) {
        const location = responseData.location;

        if (window.confirm(`You are about to be redirected to ${location}`)) {
          window.open(location, "_blank")?.focus();
        }

        return;
      }

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
            responseStatus: response.status,
            speed: computeDurationInSeconds(startTime, endTime),
          },
        });

        return;
      }

      // cast action frame response, fetch the frame
      if ("frameUrl" in responseData) {
        await fetchPOSTRequest(
          {
            // @todo make sourceFrame optional? or somehow identify it whether it is an action or not
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
          frame: responseData,
          status: "done",
          speed: computeDurationInSeconds(startTime, endTime),
          responseStatus: response.status,
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
    });

    console.error(response);
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

    const signedTransactionDataActionOrError = await signFrameAction(
      // for transaction data we always use signer, so skip signing is false here
      false,
      request.signerStateActionContext
    ).catch((e) => {
      if (e instanceof Error) {
        return e;
      }

      console.error(e);
      return new Error(
        "Unexpected error thrown by signFrameAction, see the console for details"
      );
    });

    if (signedTransactionDataActionOrError instanceof Error) {
      pushRequestErrorToStack({
        endTime: new Date(),
        frameStackPendingItem,
        responseBody: "none",
        responseStatus: 500,
        startTime,
        requestError: signedTransactionDataActionOrError,
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

    const transactionDataResponse = await fetchRequest(
      transactionDataProxiedUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...extraButtonRequestPayload,
          ...signedTransactionDataActionOrError.body,
        }),
      }
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

    // get transaction id from transaction data
    const transactionIdOrError = await onTransaction({
      frame: request.sourceFrame,
      frameButton: request.frameButton,
      transactionData,
    })
      .then((transactionId) => {
        if (!transactionId) {
          return new Error("onTransaction did not return transaction id");
        }

        return transactionId;
      })
      .catch((e) => {
        if (e instanceof Error) {
          return e;
        }

        console.error(e);
        return new Error(
          "Unexpected error thrown by onTransaction, see the console for details"
        );
      });

    if (transactionIdOrError instanceof Error) {
      pushRequestErrorToStack({
        endTime,
        frameStackPendingItem,
        responseBody: "none",
        responseStatus: 500,
        startTime,
        requestError: transactionIdOrError,
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

function fetchRequest(
  ...args: Parameters<typeof fetch>
): Promise<Response | Error> {
  return fetch(...args).catch((e) => {
    if (e instanceof Error) {
      return e;
    }

    console.error(e);

    return new TypeError("Uneexpected error thrown by fetch, check console");
  });
}

function getResponseBody(response: Response): Promise<unknown> {
  if (response.headers.get("content-type")?.includes("/json")) {
    return response.clone().json();
  }

  return response.clone().text();
}
