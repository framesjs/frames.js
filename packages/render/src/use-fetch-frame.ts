/* eslint-disable no-console -- provide feedback to console */
import type {
  FrameButtonPost,
  SupportedParsingSpecification,
  TransactionTargetResponse,
} from "frames.js";
import type { types } from "frames.js/core";
import type {
  CastActionFrameResponse,
  ComposerActionFormResponse,
  ComposerActionStateFromMessage,
  ErrorMessageResponse,
} from "frames.js/types";
import { hexToBytes } from "viem";
import type { FarcasterFrameContext } from "./farcaster";
import type {
  CastActionRequest,
  ComposerActionRequest,
  FetchFrameFunction,
  FrameActionBodyPayload,
  FrameContext,
  FrameGETRequest,
  FramePOSTRequest,
  FrameStackPending,
  FrameStackPostPending,
  GetFrameResult,
  SignedFrameAction,
  SignerStateActionContext,
  SignerStateDefaultActionContext,
  UseFetchFrameOptions,
  UseFetchFrameSignFrameActionFunction,
} from "./types";
import { isParseResult } from "./use-frame-stack";
import {
  SignatureHandlerDidNotReturnTransactionIdError,
  TransactionDataErrorResponseError,
  TransactionDataTargetMalformedError,
  TransactionHandlerDidNotReturnTransactionIdError,
  CastActionUnexpectedResponseError,
  ComposerActionUnexpectedResponseError,
} from "./errors";
import { tryCall, tryCallAsync } from "./helpers";

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

function isComposerFormActionResponse(
  response: unknown
): response is ComposerActionFormResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "type" in response &&
    response.type === "form"
  );
}

function isCastActionFrameResponse(
  response: unknown
): response is CastActionFrameResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "type" in response &&
    response.type === "frame"
  );
}

function isCastMessageResponse(
  response: unknown
): response is types.CastActionMessageResponse {
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
  TSignerStorageType = Record<string, unknown>,
  TFrameActionBodyType extends FrameActionBodyPayload = FrameActionBodyPayload,
  TFrameContextType extends FrameContext = FarcasterFrameContext,
>({
  stackAPI,
  stackDispatch,
  specification,
  frameActionProxy,
  frameGetProxy,
  extraButtonRequestPayload,
  signFrameAction,
  onTransaction,
  transactionDataSuffix,
  onSignature,
  onError = defaultErrorHandler,
  fetchFn,
  onRedirect,
  onComposerFormAction,
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
  TSignerStorageType,
  TFrameActionBodyType,
  TFrameContextType
>): FetchFrameFunction<
  SignerStateActionContext<TSignerStorageType, TFrameContextType>
> {
  async function handleFailedResponse({
    response,
    endTime,
    frameStackPendingItem,
    onError: onErrorInternal,
  }: {
    endTime: Date;
    response: Response;
    frameStackPendingItem: FrameStackPending;
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
        stackAPI.markAsDoneWithErrorMessage({
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

    stackAPI.markAsFailed({
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
      stackDispatch({ action: "CLEAR" });
    }

    const frameStackPendingItem = stackAPI.createGetPendingItem({ request });

    const response = await fetchProxied({
      proxyUrl: frameGetProxy,
      fetchFn,
      specification,
      url: request.url,
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

      const frameResult = (await response.clone().json()) as GetFrameResult;

      stackAPI.markAsDone({
        pendingItem: frameStackPendingItem,
        endTime,
        frameResult,
        response,
      });

      return;
    }

    stackAPI.markAsFailed({
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
    request: FramePOSTRequest<
      SignerStateActionContext<TSignerStorageType, TFrameContextType>
    >,
    options?: {
      preflightRequest?: {
        pendingFrameStackItem: FrameStackPostPending;
        startTime: Date;
      };
      shouldClear?: boolean;
      onError?: (error: Error) => void;
      onSuccess?: () => void;
    }
  ): Promise<void> {
    let pendingItem: FrameStackPostPending;

    if (options?.shouldClear) {
      stackDispatch({ action: "CLEAR" });
    }

    // get rid of address from request.signerStateActionContext.frameContext and pass that to sign frame action
    const signedDataOrError = await signAndGetFrameActionBodyPayload({
      signerStateActionContext: request.signerStateActionContext,
      signFrameAction,
    });

    if (signedDataOrError instanceof Error) {
      if (options?.preflightRequest) {
        // mark preflight request as failed
        stackAPI.markAsFailed({
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
      pendingItem = stackAPI.createPostPendingItem({
        action: signedDataOrError,
        request,
      });
    } else {
      pendingItem = options.preflightRequest.pendingFrameStackItem;
    }

    const response = await fetchProxied({
      proxyUrl: frameActionProxy,
      specification,
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
      currentPendingItem: FrameStackPostPending;
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

        stackAPI.markAsDoneWithRedirect({
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

        stackAPI.markAsFailedWithRequestError({
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
        stackAPI.markAsFailed({
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

      if (!isParseResult(responseData)) {
        const error = new Error("The server returned an unexpected response.");

        stackAPI.markAsFailed({
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

      stackAPI.markAsDone({
        endTime,
        frameResult: responseData,
        pendingItem,
        response,
      });

      tryCall(() => options?.onSuccess?.());

      return;
    }

    stackAPI.markAsFailed({
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
    request: FramePOSTRequest<
      SignerStateActionContext<TSignerStorageType, TFrameContextType>
    >,
    shouldClear?: boolean
  ): Promise<void> {
    if ("source" in request) {
      throw new Error(
        "Invalid request, transaction should be invoked only from a Frame. It was probably invoked from cast or composer action."
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
      stackDispatch({ action: "CLEAR" });
    }

    tryCall(() => onTransactionDataStart?.({ button }));

    const signedTransactionDataActionOrError = await tryCallAsync(() =>
      signFrameAction({
        actionContext: request.signerStateActionContext,
        // for transaction data we always use signer, so skip signing is false here
        forceRealSigner: true,
      })
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

    signedTransactionDataActionOrError.searchParams.set(
      "specification",
      specification
    );

    const transactionDataStartTime = new Date();
    const transactionDataResponse = await fetchProxied({
      proxyUrl: frameActionProxy,
      frameAction: signedTransactionDataActionOrError,
      fetchFn,
      specification,
      extraRequestPayload: extraButtonRequestPayload,
    });
    const transactionDataEndTime = new Date();

    if (transactionDataResponse instanceof Error) {
      const pendingItem = stackAPI.createPostPendingItem({
        action: signedTransactionDataActionOrError,
        request,
        startTime: transactionDataStartTime,
      });

      stackAPI.markAsFailed({
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
      const pendingItem = stackAPI.createPostPendingItem({
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
      const pendingItem = stackAPI.createPostPendingItem({
        action: signedTransactionDataActionOrError,
        request,
        startTime: transactionDataStartTime,
      });

      const error = new TransactionDataTargetMalformedError(
        transactionDataResponse.clone()
      );

      stackAPI.markAsFailed({
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
      const pendingItem = stackAPI.createPostPendingItem({
        action: signedTransactionDataActionOrError,
        request,
      });

      stackAPI.markAsFailed({
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
    const pendingItem = stackAPI.createPostPendingItem({
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

  async function fetchCastActionRequest(
    request: CastActionRequest<
      SignerStateActionContext<TSignerStorageType, TFrameContextType>
    >,
    shouldClear = false
  ): Promise<void> {
    const frameButton: FrameButtonPost = {
      action: "post",
      label: request.action.name,
      target: request.action.action.postUrl || request.action.url,
    };
    const signerStateActionContext: SignerStateDefaultActionContext<
      TSignerStorageType,
      TFrameContextType
    > = {
      ...request.signerStateActionContext,
      type: "default",
      frameButton,
    };
    const signedDataOrError = await signAndGetFrameActionBodyPayload<
      TSignerStorageType,
      TFrameActionBodyType,
      TFrameContextType
    >({
      signerStateActionContext,
      signFrameAction,
    });

    if (shouldClear) {
      stackAPI.clear();
    }

    if (signedDataOrError instanceof Error) {
      tryCall(() => {
        onError(signedDataOrError);
      });
      throw signedDataOrError;
    }

    // create pending item but do not dispatch it
    const pendingItem = stackAPI.createCastOrComposerActionPendingItem({
      action: signedDataOrError,
      request: {
        ...request,
        frameButton,
        signerStateActionContext,
        method: "POST",
        source: "cast-action",
        sourceFrame: undefined,
      },
    });

    const actionResponseOrError = await fetchProxied({
      fetchFn,
      proxyUrl: frameActionProxy,
      specification,
      frameAction: signedDataOrError,
      extraRequestPayload: extraButtonRequestPayload,
    });

    if (actionResponseOrError instanceof Error) {
      tryCall(() => {
        onError(actionResponseOrError);
      });
      throw actionResponseOrError;
    }

    // check what is the response, we expect either cast action responses or composer action responses
    try {
      const endTime = new Date();

      if (!actionResponseOrError.ok) {
        await handleFailedResponse({
          response: actionResponseOrError,
          endTime,
          frameStackPendingItem: pendingItem,
        });

        return;
      }

      const actionResponse = (await actionResponseOrError
        .clone()
        .json()) as unknown;

      if (isCastMessageResponse(actionResponse)) {
        stackAPI.markCastMessageAsDone({
          pendingItem,
          endTime,
          response: actionResponseOrError,
          responseData: actionResponse,
        });
        return;
      }

      if (isCastActionFrameResponse(actionResponse)) {
        // this is noop
        stackAPI.markCastFrameAsDone({ pendingItem, endTime });

        await fetchPOSTRequest({
          sourceFrame: undefined,
          frameButton: {
            action: "post",
            label: "action",
            target: actionResponse.frameUrl,
          },
          isDangerousSkipSigning: request.isDangerousSkipSigning,
          method: "POST",
          source: "cast-action",
          signerStateActionContext: {
            ...request.signerStateActionContext,
            type: "default",
            buttonIndex: 1,
            frameButton: {
              action: "post",
              label: "action",
              target: actionResponse.frameUrl,
            },
            target: actionResponse.frameUrl,
          },
        });
        return;
      }

      throw new CastActionUnexpectedResponseError();
    } catch (e) {
      let error: Error;

      if (!(e instanceof CastActionUnexpectedResponseError)) {
        console.error(`Unexpected response from the server`, e);
        error = e instanceof Error ? e : new Error("Unexpected error");
      } else {
        error = e;
      }

      tryCall(() => {
        onError(error);
      });
      throw error;
    }
  }

  async function fetchComposerActionRequest(
    request: ComposerActionRequest<
      SignerStateActionContext<TSignerStorageType, TFrameContextType>
    >,
    shouldClear = false
  ): Promise<void> {
    const frameButton: FrameButtonPost = {
      action: "post",
      label: request.action.name,
      target: request.action.url,
    };
    const signerStateActionContext: SignerStateDefaultActionContext<
      TSignerStorageType,
      TFrameContextType
    > = {
      ...request.signerStateActionContext,
      type: "default",
      frameButton,
      state: encodeURIComponent(
        JSON.stringify({
          cast: request.composerActionState,
        } satisfies ComposerActionStateFromMessage)
      ),
    };
    const signedDataOrError = await signAndGetFrameActionBodyPayload<
      TSignerStorageType,
      TFrameActionBodyType,
      TFrameContextType
    >({
      signerStateActionContext,
      signFrameAction,
    });

    if (shouldClear) {
      stackAPI.clear();
    }

    if (signedDataOrError instanceof Error) {
      tryCall(() => {
        onError(signedDataOrError);
      });
      throw signedDataOrError;
    }

    // create pending item but do not dispatch it
    const pendingItem = stackAPI.createCastOrComposerActionPendingItem({
      action: signedDataOrError,
      request: {
        ...request,
        frameButton,
        signerStateActionContext,
        method: "POST",
        source: "composer-action",
        sourceFrame: undefined,
      },
    });

    const actionResponseOrError = await fetchProxied({
      fetchFn,
      proxyUrl: frameActionProxy,
      specification,
      frameAction: signedDataOrError,
      extraRequestPayload: extraButtonRequestPayload,
    });

    if (actionResponseOrError instanceof Error) {
      tryCall(() => {
        onError(actionResponseOrError);
      });
      throw actionResponseOrError;
    }

    // check what is the response, we expect either cast action responses or composer action responses
    try {
      const endTime = new Date();

      if (!actionResponseOrError.ok) {
        await handleFailedResponse({
          response: actionResponseOrError,
          endTime,
          frameStackPendingItem: pendingItem,
        });

        return;
      }

      const actionResponse = (await actionResponseOrError
        .clone()
        .json()) as unknown;

      if (!isComposerFormActionResponse(actionResponse)) {
        throw new ComposerActionUnexpectedResponseError();
      }

      // this is noop
      stackAPI.markComposerFormActionAsDone({ pendingItem, endTime });

      await onComposerFormAction({
        form: actionResponse,
        cast: {
          embeds: [],
          text: "Cast text",
        },
      });
    } catch (e) {
      let error: Error;

      if (!(e instanceof ComposerActionUnexpectedResponseError)) {
        console.error(`Unexpected response from the server`, e);
        error = e instanceof Error ? e : new Error("Unexpected error");
      } else {
        error = e;
      }

      tryCall(() => {
        onError(error);
      });
      throw error;
    }
  }

  return (request, shouldClear = false) => {
    if (request.method === "GET") {
      return fetchGETRequest(request, shouldClear);
    }

    if (request.method === "CAST_ACTION") {
      return fetchCastActionRequest(request, shouldClear);
    }

    if (request.method === "COMPOSER_ACTION") {
      return fetchComposerActionRequest(request, shouldClear);
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
  specification: SupportedParsingSpecification;
  fetchFn: typeof fetch;
} & (
  | {
      frameAction: SignedFrameAction;
      extraRequestPayload?: Record<string, unknown>;
    }
  | { url: string }
);

async function fetchProxied(
  params: FetchProxiedArg
): Promise<Response | Error> {
  const searchParams = new URLSearchParams({
    specification: params.specification,
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

  searchParams.set("url", params.url);

  const proxyUrl = proxyUrlAndSearchParamsToUrl(params.proxyUrl, searchParams);

  return tryCallAsync(() => params.fetchFn(proxyUrl, { method: "GET" }));
}

function getResponseBody(response: Response): Promise<unknown> {
  if (response.headers.get("content-type")?.includes("/json")) {
    return response.clone().json();
  }

  return response.clone().text();
}

type SignAndGetFrameActionPayloadOptions<
  TSignerStorageType,
  TFrameActionBodyType extends FrameActionBodyPayload,
  TFrameContextType extends FrameContext,
> = {
  signerStateActionContext: SignerStateActionContext<
    TSignerStorageType,
    TFrameContextType
  >;
  signFrameAction: UseFetchFrameSignFrameActionFunction<
    SignerStateActionContext<TSignerStorageType, TFrameContextType>,
    TFrameActionBodyType
  >;
};

/**
 * This shouldn't be used for transaction data request
 */
async function signAndGetFrameActionBodyPayload<
  TSignerStorageType,
  TFrameActionBodyType extends FrameActionBodyPayload,
  TFrameContextType extends FrameContext,
>({
  signerStateActionContext,
  signFrameAction,
}: SignAndGetFrameActionPayloadOptions<
  TSignerStorageType,
  TFrameActionBodyType,
  TFrameContextType
>): Promise<Error | SignedFrameAction> {
  // Transacting address is not included in post action
  const { address: _, ...requiredFrameContext } =
    signerStateActionContext.frameContext as unknown as FarcasterFrameContext;

  return tryCallAsync(() =>
    signFrameAction({
      actionContext: {
        ...signerStateActionContext,
        frameContext: requiredFrameContext as unknown as TFrameContextType,
      },
    })
  );
}
