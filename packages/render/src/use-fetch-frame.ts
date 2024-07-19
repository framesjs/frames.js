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
  ErrorMessageResponse,
  FramesContext,
} from "frames.js/types";
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
  UseFetchFrameOptions,
  UseFetchFrameSignFrameActionFunction,
} from "./types";
import type { FarcasterFrameContext } from "./farcaster";
import { isParseResult } from "./use-frame-stack";

class UnexpectedCastActionResponseError extends Error {
  constructor() {
    super("Unexpected cast action response from the server");
  }
}

class UnexpectedComposerActionResponseError extends Error {
  constructor() {
    super("Unexpected composer action response from the server");
  }
}

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
  TSignerStorageType = object,
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
  onSignature,
  onError = defaultErrorHandler,
  fetchFn,
  onRedirect,
  onComposerFormAction,
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
  }: {
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
        frameStackPendingItem.method === "POST" &&
        isErrorMessageResponse(responseBody)
      ) {
        stackAPI.markAsDoneWithErrorMessage({
          pendingItem: frameStackPendingItem,
          endTime,
          response,
          responseData: responseBody,
        });
        onError(new Error(responseBody.message));

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
    onError(requestError);
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
    onError(response);
  }

  async function fetchPOSTRequest<
    TSignerStateActionContext extends SignerStateActionContext<any, any>,
  >(
    request: FramePOSTRequest<TSignerStateActionContext>,
    options?: { pendingFrameStackItem: FrameStackPostPending; startTime: Date },
    shouldClear?: boolean
  ): Promise<void> {
    let pendingItem: FrameStackPostPending;

    if (shouldClear) {
      stackDispatch({ action: "CLEAR" });
    }

    // get rid of address from request.signerStateActionContext.frameContext and pass that to sign frame action
    const signedDataOrError = await signAndGetFrameActionBodyPayload({
      signerStateActionContext: request.signerStateActionContext,
      signFrameAction,
    });

    if (signedDataOrError instanceof Error) {
      if (options) {
        // mark preflight request as failed
        stackAPI.markAsFailed({
          pendingItem: options.pendingFrameStackItem,
          endTime: new Date(),
          requestError: signedDataOrError,
          response: null, // there is no response because didn't even got to request
          responseBody: "none",
          responseStatus: 500,
        });
      }
      onError(signedDataOrError);

      return;
    }

    // if there are no options passed there is no preflight happening (for example in case of transactions we first fetch transaction data and then post it to frame)
    // in that case options are passed so we can manipulate the pending item
    if (!options) {
      pendingItem = stackAPI.createPostPendingItem({
        action: signedDataOrError,
        request,
      });
    } else {
      pendingItem = options.pendingFrameStackItem;
    }

    const response = await fetchProxied({
      proxyUrl: frameActionProxy,
      specification,
      fetchFn,
      frameAction: signedDataOrError,
      extraRequestPayload: extraButtonRequestPayload,
    });

    const endTime = new Date();

    async function handleRedirect(
      res: Response,
      currentPendingItem: FrameStackPostPending
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
        onError(error);
      }
    }

    if (response instanceof Response) {
      // handle valid redirect
      if (response.status === 302) {
        await handleRedirect(response, pendingItem);

        return;
      }

      if (!response.ok) {
        await handleFailedResponse({
          response,
          endTime,
          frameStackPendingItem: pendingItem,
        });

        return;
      }

      const responseData = (await response.clone().json()) as unknown;

      if (!isParseResult(responseData)) {
        const error = new Error(`The server returned an unexpected response.`);

        stackAPI.markAsFailed({
          endTime,
          pendingItem,
          requestError: error,
          response,
          responseBody: responseData,
          responseStatus: 500,
        });
        onError(error);

        return;
      }

      stackAPI.markAsDone({
        endTime,
        frameResult: responseData,
        pendingItem,
        response,
      });

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
    onError(response);
  }

  async function fetchTransactionRequest<
    TSignerStateActionContext extends SignerStateActionContext<any, any>,
  >(
    request: FramePOSTRequest<TSignerStateActionContext>,
    shouldClear?: boolean
  ): Promise<void> {
    const button = request.frameButton;
    const sourceFrame = request.sourceFrame;

    if (button.action !== "tx") {
      throw new Error("Invalid frame button action, tx expected");
    }

    if (shouldClear) {
      stackDispatch({ action: "CLEAR" });
    }

    const startTime = new Date();

    const signedTransactionDataActionOrError = await tryCall(
      signFrameAction({
        actionContext: request.signerStateActionContext,
        // for transaction data we always use signer, so skip signing is false here
        forceRealSigner: true,
      })
    );

    if (signedTransactionDataActionOrError instanceof Error) {
      onError(signedTransactionDataActionOrError);
      return;
    }

    const pendingItem = stackAPI.createPostPendingItem({
      action: signedTransactionDataActionOrError,
      request,
    });

    signedTransactionDataActionOrError.searchParams.set(
      "specification",
      specification
    );

    const transactionDataResponse = await fetchProxied({
      proxyUrl: frameActionProxy,
      frameAction: signedTransactionDataActionOrError,
      fetchFn,
      specification,
      extraRequestPayload: extraButtonRequestPayload,
    });
    const endTime = new Date();

    if (transactionDataResponse instanceof Error) {
      stackAPI.markAsFailed({
        endTime,
        pendingItem,
        requestError: transactionDataResponse,
        response: null,
        responseBody: "none",
        responseStatus: 500,
      });
      onError(transactionDataResponse);

      return;
    }

    if (!transactionDataResponse.ok) {
      await handleFailedResponse({
        response: transactionDataResponse,
        endTime,
        frameStackPendingItem: pendingItem,
      });

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

    const transactionData = (await transactionDataResponse.json()) as unknown;

    if (!isTransactionTargetResponse(transactionData)) {
      const error = new Error(
        "The server returned an unexpected response for transaction data."
      );

      stackAPI.markAsFailed({
        endTime,
        pendingItem,
        requestError: error,
        response: transactionDataResponse,
        responseBody: transactionData,
        responseStatus: 500,
      });
      onError(error);

      return;
    }

    let transactionIdOrError: `0x${string}` | Error;

    // get transaction id or signature id from transaction data
    if (transactionData.method === "eth_sendTransaction") {
      transactionIdOrError = await tryCall(
        onTransaction({
          frame: sourceFrame,
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
          frame: sourceFrame,
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
      stackAPI.markAsFailed({
        pendingItem,
        endTime,
        requestError: transactionIdOrError,
        response: null,
        responseBody: "none",
        responseStatus: 500,
      });
      onError(transactionIdOrError);

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
          target: button.post_url || sourceFrame.postUrl || button.target,
        },
      },
      // we are continuing with the same pending item
      {
        pendingFrameStackItem: pendingItem,
        startTime,
      }
    );
  }

  async function fetchCastActionRequest<
    TSignerStateActionContext extends SignerStateActionContext<any, any>,
  >(
    request: CastActionRequest<TSignerStateActionContext>,
    shouldClear = false
  ): Promise<void> {
    const frameButton: FrameButtonPost = {
      action: "post",
      label: request.action.name,
      target: request.action.url,
    };
    const signerStateActionContext = {
      ...request.signerStateActionContext,
      frameButton,
    };
    const signedDataOrError = await signAndGetFrameActionBodyPayload({
      signerStateActionContext,
      signFrameAction,
    });

    if (shouldClear) {
      stackAPI.clear();
    }

    if (signedDataOrError instanceof Error) {
      onError(signedDataOrError);
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
        // @todo find a better way how to do this, perhaps pending item should not be create here at all and be created only for relevant requests
        // actions don't have source frame, fake it
        sourceFrame: {
          image: "",
          version: "vNext",
        },
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
      onError(actionResponseOrError);
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
          // actions don't have source frame, fake it
          sourceFrame: {
            image: "",
            version: "vNext",
          },
          frameButton: {
            action: "post",
            label: "action",
            target: actionResponse.frameUrl,
          },
          isDangerousSkipSigning: request.isDangerousSkipSigning,
          method: "POST",
          signerStateActionContext: {
            ...request.signerStateActionContext,
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

      throw new UnexpectedCastActionResponseError();
    } catch (e) {
      let error: Error;

      if (!(e instanceof UnexpectedCastActionResponseError)) {
        console.error(`Unexpected response from the server`, e);
        error = e instanceof Error ? e : new Error("Unexpected error");
      } else {
        error = e;
      }

      onError(error);
      throw error;
    }
  }

  async function fetchComposerActionRequest<
    TSignerStateActionContext extends SignerStateActionContext<any, any>,
  >(
    request: ComposerActionRequest<TSignerStateActionContext>,
    shouldClear = false
  ): Promise<void> {
    const frameButton: FrameButtonPost = {
      action: "post",
      label: request.action.name,
      target: request.action.url,
    };
    const signerStateActionContext = {
      ...request.signerStateActionContext,
      frameButton,
      state: encodeURIComponent(JSON.stringify(request.composerActionState)),
    };
    const signedDataOrError = await signAndGetFrameActionBodyPayload({
      signerStateActionContext,
      signFrameAction,
    });

    if (shouldClear) {
      stackAPI.clear();
    }

    if (signedDataOrError instanceof Error) {
      onError(signedDataOrError);
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
        sourceFrame: {
          image: "",
          version: "vNext",
        },
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
      onError(actionResponseOrError);
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
        throw new UnexpectedComposerActionResponseError();
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

      if (!(e instanceof UnexpectedComposerActionResponseError)) {
        console.error(`Unexpected response from the server`, e);
        error = e instanceof Error ? e : new Error("Unexpected error");
      } else {
        error = e;
      }

      onError(error);
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

    return fetchPOSTRequest(request, undefined, shouldClear);
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

    return tryCall(
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

  return tryCall(params.fetchFn(proxyUrl, { method: "GET" }));
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

type SignAndGetFrameActionPayloadOptions<
  TSignerStorageType,
  TFrameActionBodyType extends FrameActionBodyPayload,
  TFrameContextType extends FramesContext,
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
  TFrameContextType extends FramesContext,
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

  return tryCall(
    signFrameAction({
      actionContext: {
        ...signerStateActionContext,
        frameContext: requiredFrameContext as unknown as TFrameContextType,
      },
    })
  );
}
