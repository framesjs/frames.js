/* eslint-disable no-console -- provide feedback to console */
import type { TransactionTargetResponse } from "frames.js";
import type { ErrorMessageResponse } from "frames.js/types";
import { hexToBytes } from "viem";
import type { FarcasterFrameContext } from "./farcaster";
import {
  SignatureHandlerDidNotReturnTransactionIdError,
  TransactionDataErrorResponseError,
  TransactionDataTargetMalformedError,
  TransactionHandlerDidNotReturnTransactionIdError,
} from "./errors";
import {
  isParseFramesWithReportsResult,
  tryCall,
  tryCallAsync,
} from "./helpers";
import type {
  FetchFrameFunction,
  FrameStackPending,
  FrameStackPostPending,
  UseFetchFrameOptions,
} from "./unstable-types";
import type {
  FrameGETRequest,
  FramePOSTRequest,
  SignedFrameAction,
  SignerStateActionContext,
  SignerStateInstance,
} from "./types";

function isErrorMessageResponse(
  response: unknown
): response is ErrorMessageResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "message" in response &&
    typeof response.message === "string"
  );
}

function defaultErrorHandler(error: Error): void {
  console.error(error);
}

export function useFetchFrame<
  TExtraPending = unknown,
  TExtraDone = unknown,
  TExtraDoneRedirect = unknown,
  TExtraRequestError = unknown,
  TExtraMesssage = unknown,
>({
  frameStateAPI,
  frameState,
  frameActionProxy,
  frameGetProxy,
  extraButtonRequestPayload,
  parseFarcasterManifest = false,
  onTransaction,
  transactionDataSuffix,
  onSignature,
  onError = defaultErrorHandler,
  fetchFn,
  onRedirect,
  onTransactionDataError,
  onTransactionDataStart,
  onTransactionDataSuccess,
  onTransactionError,
  onTransactionStart,
  onTransactionSuccess,
  onSignatureError,
  onSignatureStart,
  onSignatureSuccess,
  onTransactionProcessingError,
  onTransactionProcessingStart,
  onTransactionProcessingSuccess,
}: UseFetchFrameOptions<
  TExtraPending,
  TExtraDone,
  TExtraDoneRedirect,
  TExtraRequestError,
  TExtraMesssage
>): FetchFrameFunction {
  async function handleFailedResponse({
    response,
    endTime,
    frameStackPendingItem,
    onError: onErrorInternal,
  }: {
    endTime: Date;
    response: Response;
    frameStackPendingItem: FrameStackPending<TExtraPending>;
    onError?: (error: Error) => void;
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
        frameStackPendingItem.method === "POST" &&
        isErrorMessageResponse(responseBody)
      ) {
        frameStateAPI.markAsDoneWithErrorMessage({
          pendingItem: frameStackPendingItem,
          endTime,
          response,
          responseData: responseBody,
        });
        const error = new Error(responseBody.message);
        tryCall(() => {
          onError(error);
        });
        tryCall(() => onErrorInternal?.(error));

        return;
      }
    }

    const requestError = new Error(
      `The server returned an error but it does not contain message property. Status code: ${response.status}`
    );

    frameStateAPI.markAsFailed({
      endTime,
      pendingItem: frameStackPendingItem,
      requestError,
      responseStatus: response.status,
      response,
      responseBody,
    });
    tryCall(() => {
      onError(requestError);
    });
    tryCall(() => onErrorInternal?.(requestError));
  }

  async function fetchGETRequest(
    request: FrameGETRequest,
    shouldClear?: boolean
  ): Promise<void> {
    if (shouldClear) {
      // this clears initial frame since that is loading from SSR since we aren't able to finish it.
      // not an ideal solution
      frameStateAPI.clear();
    }

    const frameStackPendingItem = frameStateAPI.createGetPendingItem({
      request,
    });

    const response = await fetchProxied({
      proxyUrl: frameGetProxy,
      fetchFn,
      url: request.url,
      parseFarcasterManifest,
    });

    const endTime = new Date();

    if (response instanceof Response) {
      if (!response.ok) {
        await handleFailedResponse({
          response,
          endTime,
          frameStackPendingItem,
        });

        return;
      }

      const parseResult = await tryCallAsync(
        () => response.clone().json() as Promise<unknown>
      );

      if (parseResult instanceof Error) {
        frameStateAPI.markAsFailed({
          pendingItem: frameStackPendingItem,
          endTime,
          requestError: parseResult,
          response,
          responseBody: "none",
          responseStatus: 500,
        });

        tryCall(() => {
          onError(parseResult);
        });

        return;
      }

      if (!isParseFramesWithReportsResult(parseResult)) {
        const error = new Error("The server returned an unexpected response.");

        frameStateAPI.markAsFailed({
          pendingItem: frameStackPendingItem,
          endTime,
          requestError: error,
          response,
          responseBody: "none",
          responseStatus: 500,
        });

        tryCall(() => {
          onError(error);
        });

        return;
      }

      frameStateAPI.markAsDone({
        pendingItem: frameStackPendingItem,
        endTime,
        parseResult,
        responseBody: await response.clone().text(),
        response: response.clone(),
      });

      return;
    }

    frameStateAPI.markAsFailed({
      pendingItem: frameStackPendingItem,
      endTime,
      requestError: response,
      response: null,
      responseBody: "none",
      responseStatus: 500,
    });
    tryCall(() => {
      onError(response);
    });
  }

  async function fetchPOSTRequest(
    request: FramePOSTRequest<SignerStateActionContext>,
    options?: {
      preflightRequest?: {
        pendingFrameStackItem: FrameStackPostPending<TExtraPending>;
        startTime: Date;
      };
      shouldClear?: boolean;
      onError?: (error: Error) => void;
      onSuccess?: () => void;
    }
  ): Promise<void> {
    let pendingItem: FrameStackPostPending<TExtraPending>;

    if (frameState.type === "not-initialized") {
      throw new Error(
        "POST Request cannot be made before the frame is initialized"
      );
    }

    if (options?.shouldClear) {
      frameStateAPI.clear();
    }

    // get rid of address from request.signerStateActionContext.frameContext and pass that to sign frame action
    const signedDataOrError = await signAndGetFrameActionBodyPayload({
      request,
      signerState: frameState.signerState,
    });

    if (signedDataOrError instanceof Error) {
      if (options?.preflightRequest) {
        // mark preflight request as failed
        frameStateAPI.markAsFailed({
          pendingItem: options.preflightRequest.pendingFrameStackItem,
          endTime: new Date(),
          requestError: signedDataOrError,
          response: null, // there is no response because didn't even got to request
          responseBody: "none",
          responseStatus: 500,
        });
      }
      tryCall(() => {
        onError(signedDataOrError);
      });
      tryCall(() => options?.onError?.(signedDataOrError));

      return;
    }

    // if there is no preflight happening (for example in case of transactions we first fetch transaction data and then post it to frame)
    // in that case options are passed so we can manipulate the pending item
    if (!options?.preflightRequest) {
      pendingItem = frameStateAPI.createPostPendingItem({
        action: signedDataOrError,
        request,
      });
    } else {
      pendingItem = options.preflightRequest.pendingFrameStackItem;
    }

    const response = await fetchProxied({
      proxyUrl: frameActionProxy,
      fetchFn,
      frameAction: signedDataOrError,
      extraRequestPayload: extraButtonRequestPayload,
    });

    const endTime = new Date();

    async function handleRedirect({
      response: res,
      currentPendingItem,
      onError: onErrorInternal,
      onSuccess: onSuccessInternal,
    }: {
      response: Response;
      currentPendingItem: FrameStackPostPending<TExtraPending>;
      onError?: (error: Error) => void;
      onSuccess?: () => void;
    }): Promise<void> {
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

        // Reject non-http(s) URLs
        if (
          locationUrl.protocol !== "http:" &&
          locationUrl.protocol !== "https:"
        ) {
          throw new Error(
            `Redirect location ${location} is not a valid HTTP or HTTPS URL.`
          );
        }

        tryCall(() => {
          onRedirect(locationUrl);
        });
        tryCall(() => onSuccessInternal?.());

        frameStateAPI.markAsDoneWithRedirect({
          pendingItem: currentPendingItem,
          endTime,
          location,
          response: res.clone(),
          responseBody: await res.clone().text(),
        });
      } catch (e) {
        const error =
          e instanceof Error
            ? e
            : new Error(
                "Response body must be a json with 'location' property or response 'Location' header must contain fully qualified URL."
              );

        frameStateAPI.markAsFailedWithRequestError({
          pendingItem: currentPendingItem,
          error,
          response: res,
          endTime,
          responseBody: await res.clone().text(),
        });
        tryCall(() => onErrorInternal?.(error));
        tryCall(() => {
          onError(error);
        });
      }
    }

    if (response instanceof Response) {
      // handle valid redirect
      if (response.status === 302) {
        await handleRedirect({
          response,
          currentPendingItem: pendingItem,
          onError: options?.onError,
          onSuccess: options?.onSuccess,
        });

        return;
      }

      if (!response.ok) {
        await handleFailedResponse({
          response,
          endTime,
          frameStackPendingItem: pendingItem,
          onError: options?.onError,
        });

        return;
      }

      const responseData = await tryCall(
        () => response.clone().json() as Promise<unknown>
      );

      if (responseData instanceof Error) {
        frameStateAPI.markAsFailed({
          endTime,
          pendingItem,
          requestError: responseData,
          response,
          responseBody: "none",
          responseStatus: 500,
        });
        tryCall(() => {
          onError(responseData);
        });
        tryCall(() => options?.onError?.(responseData));

        return;
      }

      if (!isParseFramesWithReportsResult(responseData)) {
        const error = new Error("The server returned an unexpected response.");

        frameStateAPI.markAsFailed({
          endTime,
          pendingItem,
          requestError: error,
          response,
          responseBody: responseData,
          responseStatus: 500,
        });
        tryCall(() => {
          onError(error);
        });
        tryCall(() => options?.onError?.(error));

        return;
      }

      frameStateAPI.markAsDone({
        endTime,
        parseResult: responseData,
        pendingItem,
        response,
        responseBody: await response.clone().text(),
      });

      tryCall(() => options?.onSuccess?.());

      return;
    }

    frameStateAPI.markAsFailed({
      endTime,
      pendingItem,
      requestError: response,
      response: new Response(response.message, {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      }),
      responseBody: "none",
      responseStatus: 500,
    });
    tryCall(() => {
      onError(response);
    });
    tryCall(() => options?.onError?.(response));
  }

  async function fetchTransactionRequest(
    request: FramePOSTRequest<SignerStateActionContext>,
    shouldClear?: boolean
  ): Promise<void> {
    if ("source" in request) {
      throw new Error(
        "Invalid request, transaction should be invoked only from a Frame. It was probably invoked from cast or composer action."
      );
    }

    if (frameState.type === "not-initialized") {
      throw new Error(
        "Transaction Request cannot be made before the frame is initialized"
      );
    }

    const button = request.frameButton;
    const sourceFrame = request.sourceFrame;

    if (button.action !== "tx") {
      throw new Error("Invalid frame button action, tx expected");
    }

    if (request.signerStateActionContext.type !== "tx-data") {
      throw new Error(
        "Invalid signer state action context type, tx-data expected"
      );
    }

    if (shouldClear) {
      frameStateAPI.clear();
    }

    tryCall(() => onTransactionDataStart?.({ button }));

    const signedTransactionDataActionOrError = await tryCallAsync(() =>
      frameState.signerState.signFrameAction(request.signerStateActionContext)
    );

    if (signedTransactionDataActionOrError instanceof Error) {
      tryCall(() => {
        onError(signedTransactionDataActionOrError);
      });
      tryCall(() =>
        onTransactionDataError?.(signedTransactionDataActionOrError)
      );
      return;
    }

    const transactionDataStartTime = new Date();
    const transactionDataResponse = await fetchProxied({
      proxyUrl: frameActionProxy,
      frameAction: signedTransactionDataActionOrError,
      fetchFn,
      extraRequestPayload: extraButtonRequestPayload,
    });
    const transactionDataEndTime = new Date();

    if (transactionDataResponse instanceof Error) {
      const pendingItem = frameStateAPI.createPostPendingItem({
        action: signedTransactionDataActionOrError,
        request,
        startTime: transactionDataStartTime,
      });

      frameStateAPI.markAsFailed({
        endTime: transactionDataEndTime,
        pendingItem,
        requestError: transactionDataResponse,
        response: null,
        responseBody: "none",
        responseStatus: 500,
      });
      tryCall(() => onTransactionDataError?.(transactionDataResponse));
      tryCall(() => {
        onError(transactionDataResponse);
      });

      return;
    }

    if (!transactionDataResponse.ok) {
      // show as error
      const pendingItem = frameStateAPI.createPostPendingItem({
        action: signedTransactionDataActionOrError,
        request,
        startTime: transactionDataStartTime,
      });

      await handleFailedResponse({
        response: transactionDataResponse,
        endTime: transactionDataEndTime,
        frameStackPendingItem: pendingItem,
      });

      tryCall(() =>
        onTransactionDataError?.(
          new TransactionDataErrorResponseError(transactionDataResponse.clone())
        )
      );

      return;
    }

    function isTransactionTargetResponse(
      response: unknown
    ): response is TransactionTargetResponse {
      return (
        typeof response === "object" &&
        response !== null &&
        "method" in response
      );
    }

    // try to parse and catch the error, this is too optimistic

    const transactionData = await tryCallAsync<unknown>(() =>
      transactionDataResponse.clone().json()
    );

    if (!isTransactionTargetResponse(transactionData)) {
      const pendingItem = frameStateAPI.createPostPendingItem({
        action: signedTransactionDataActionOrError,
        request,
        startTime: transactionDataStartTime,
      });

      const error = new TransactionDataTargetMalformedError(
        transactionDataResponse.clone()
      );

      frameStateAPI.markAsFailed({
        endTime: transactionDataEndTime,
        pendingItem,
        requestError: error,
        response: transactionDataResponse,
        responseBody: transactionData,
        responseStatus: 500,
      });
      tryCall(() => onTransactionDataError?.(error));
      tryCall(() => {
        onError(error);
      });

      return;
    }

    tryCall(() =>
      onTransactionDataSuccess?.({ button, data: transactionData })
    );

    let transactionIdOrError: `0x${string}` | Error;

    // get transaction id or signature id from transaction data
    if (transactionData.method === "eth_sendTransaction") {
      // Add transaction data suffix
      if (
        transactionData.params.data &&
        transactionData.attribution !== false &&
        transactionDataSuffix &&
        // Has a function signature
        hexToBytes(transactionData.params.data).length > 4
      ) {
        transactionData.params.data = (transactionData.params.data +
          transactionDataSuffix.slice(2)) as `0x${string}`;
      }

      tryCall(() => onTransactionStart?.({ button, data: transactionData }));

      transactionIdOrError = await tryCallAsync(() =>
        onTransaction({
          frame: sourceFrame,
          frameButton: request.frameButton,
          transactionData,
        }).then((transactionId) => {
          if (!transactionId) {
            return new TransactionHandlerDidNotReturnTransactionIdError();
          }

          return transactionId;
        })
      );

      if (!(transactionIdOrError instanceof Error)) {
        tryCall(() => onTransactionSuccess?.({ button }));
      } else {
        tryCall(() => onTransactionError?.(transactionIdOrError as Error));
      }
    } else {
      tryCall(() => onSignatureStart?.({ button, data: transactionData }));

      transactionIdOrError = await tryCallAsync(() =>
        onSignature({
          frame: sourceFrame,
          frameButton: request.frameButton,
          signatureData: transactionData,
        }).then((signatureHash) => {
          if (!signatureHash) {
            return new SignatureHandlerDidNotReturnTransactionIdError();
          }

          return signatureHash;
        })
      );

      if (!(transactionIdOrError instanceof Error)) {
        tryCall(() => onSignatureSuccess?.({ button }));
      } else {
        tryCall(() => onSignatureError?.(transactionIdOrError as Error));
      }
    }

    if (transactionIdOrError instanceof Error) {
      const pendingItem = frameStateAPI.createPostPendingItem({
        action: signedTransactionDataActionOrError,
        request,
      });

      frameStateAPI.markAsFailed({
        pendingItem,
        endTime: new Date(),
        requestError: transactionIdOrError,
        response: null,
        responseBody: "none",
        responseStatus: 500,
      });
      tryCall(() => {
        onError(transactionIdOrError);
      });

      return;
    }

    tryCall(() =>
      onTransactionProcessingStart?.({
        button,
        transactionId: transactionIdOrError,
      })
    );

    const startTime = new Date();
    const pendingItem = frameStateAPI.createPostPendingItem({
      action: signedTransactionDataActionOrError,
      request,
    });

    await fetchPOSTRequest(
      {
        ...request,
        signerStateActionContext: {
          ...request.signerStateActionContext,
          type: "tx-post",
          // include transactionId in payload
          transactionId: transactionIdOrError,
          // override target so the the request is sent to proper endpoint
          target: button.post_url || sourceFrame.postUrl || button.target,
        },
      },
      {
        // we are continuing with the same pending item
        preflightRequest: {
          pendingFrameStackItem: pendingItem,
          startTime,
        },
        onError(error) {
          tryCall(() => onTransactionProcessingError?.(error));
        },
        onSuccess() {
          tryCall(() =>
            onTransactionProcessingSuccess?.({
              button,
              transactionId: transactionIdOrError,
            })
          );
        },
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

    return fetchPOSTRequest(request, {
      shouldClear,
    });
  };
}

function proxyUrlAndSearchParamsToUrl(
  proxyUrl: string,
  ...searchParams: URLSearchParams[]
): string {
  const temporaryDomain = "temporary-for-parsing-purposes.tld";
  const parsedProxyUrl = new URL(proxyUrl, `http://${temporaryDomain}`);

  searchParams.forEach((params) => {
    params.forEach((value, key) => {
      parsedProxyUrl.searchParams.set(key, value);
    });
  });

  return parsedProxyUrl.hostname === temporaryDomain
    ? `${parsedProxyUrl.pathname}${parsedProxyUrl.search}`
    : parsedProxyUrl.toString();
}

type FetchProxiedArg = {
  proxyUrl: string;
  fetchFn: typeof fetch;
  /**
   * Valid only for GET requests
   */
  parseFarcasterManifest?: boolean;
  signal?: AbortSignal;
} & (
  | {
      frameAction: SignedFrameAction;
      extraRequestPayload?: Record<string, unknown>;
    }
  | { url: string }
);

export async function fetchProxied(
  params: FetchProxiedArg
): Promise<Response | Error> {
  const searchParams = new URLSearchParams({
    multispecification: "true",
  });

  if ("frameAction" in params) {
    const proxyUrl = proxyUrlAndSearchParamsToUrl(
      params.proxyUrl,
      searchParams,
      params.frameAction.searchParams
    );

    return tryCallAsync(() =>
      params.fetchFn(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...params.extraRequestPayload,
          ...params.frameAction.body,
        }),
      })
    );
  }

  if (params.parseFarcasterManifest) {
    searchParams.set("parseFarcasterManifest", "true");
  }

  searchParams.set("url", params.url);

  const proxyUrl = proxyUrlAndSearchParamsToUrl(params.proxyUrl, searchParams);

  return tryCallAsync(() =>
    params.fetchFn(proxyUrl, { method: "GET", signal: params.signal })
  );
}

function getResponseBody(response: Response): Promise<unknown> {
  if (response.headers.get("content-type")?.includes("/json")) {
    return response.clone().json();
  }

  return response.clone().text();
}

type SignAndGetFrameActionPayloadOptions = {
  request: FramePOSTRequest<SignerStateActionContext>;
  signerState: SignerStateInstance;
};

/**
 * This shouldn't be used for transaction data request
 */
async function signAndGetFrameActionBodyPayload({
  request,
  signerState,
}: SignAndGetFrameActionPayloadOptions): Promise<Error | SignedFrameAction> {
  // Transacting address is not included in post action
  const { address: _, ...requiredFrameContext } = request
    .signerStateActionContext.frameContext as unknown as FarcasterFrameContext;

  return tryCallAsync(() =>
    signerState.signFrameAction({
      ...request.signerStateActionContext,
      frameContext: requiredFrameContext,
    })
  );
}
