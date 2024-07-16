import type { ClientProtocolId } from "../types";
import { RequestBodyNotJSONError } from "../core/errors";
import type {
  FramesHandlerFunctionReturnType,
  FramesMiddleware,
  FramesMiddlewareReturnType,
  JsonValue,
} from "../core/types";
import { isFrameDefinition } from "../core/utils";
import type { AnonymousFrameMessageReturnType } from "../anonymous";
import {
  getAnonymousFrameMessage,
  isAnonymousFrameActionPayload,
} from "../anonymous";
import type { MessageWithWalletAddressImplementation } from "./walletAddressMiddleware";

const defaultClientProtocolHandler: ClientProtocolHandler<AnonymousFrameMessageReturnType> =
  {
    isValidPayload: isAnonymousFrameActionPayload,
    getFrameMessage: getAnonymousFrameMessage,
  };

const defaultClientProtocol: ClientProtocolId = {
  id: "anonymous",
  version: "1.0",
};

export type OpenFramesMessageContext<
  T extends MessageWithWalletAddressImplementation,
> = {
  message?: T;
  clientProtocol?: ClientProtocolId;
};

export type ClientProtocolHandler<
  T extends MessageWithWalletAddressImplementation,
> = {
  getFrameMessage: (body: JsonValue) => Promise<T | undefined> | undefined;
  isValidPayload: (body: JsonValue) => boolean;
};

async function cloneJsonBody(request: Request): Promise<JsonValue | undefined> {
  try {
    // use clone just in case someone wants to read body somewhere along the way
    const body = (await request
      .clone()
      .json()
      .catch(() => {
        throw new RequestBodyNotJSONError();
      })) as JsonValue;

    return body;
  } catch (e) {
    if (e instanceof RequestBodyNotJSONError) {
      return undefined;
    }

    // eslint-disable-next-line no-console -- provide feedback to the developer
    console.error(e);

    return undefined;
  }
}

async function nextInjectAcceptedClient({
  nextResult,
  clientProtocol,
}: {
  nextResult: FramesMiddlewareReturnType<any>;
  clientProtocol: ClientProtocolId;
}): Promise<FramesHandlerFunctionReturnType<any> | Response> {
  const result = await nextResult;

  if (isFrameDefinition(result)) {
    return { ...result, accepts: [...(result.accepts || []), clientProtocol] };
  }

  return result;
}

export function openframes<
  T extends
    MessageWithWalletAddressImplementation = AnonymousFrameMessageReturnType,
>(
  {
    clientProtocol: clientProtocolRaw,
    handler,
  }: {
    /**
     * Validator and handler for frame messages from a supported client protocol.
     * `clientProtocol` is the ID of the client protocol in the form of a ClientProtocolId object or a string of the shape `"id@version"`
     * Handler is an object containing a frame message validator and handler
     * The output of the handler is added to the context as `message`
     */
    clientProtocol: ClientProtocolId | `${string}@${string}`;
    handler: ClientProtocolHandler<T>;
  } = {
    clientProtocol: defaultClientProtocol,
    // @ts-expect-error hard to type internally so skipping for now
    handler: defaultClientProtocolHandler,
  }
): FramesMiddleware<any, OpenFramesMessageContext<T>> {
  return async (context, next) => {
    let clientProtocol: ClientProtocolId;

    if (typeof clientProtocolRaw === "string") {
      const [id, version] = clientProtocolRaw.split("@");

      if (!id || !version) {
        throw new Error(
          `Invalid client protocol string. Expected format is "id@version"`
        );
      }

      clientProtocol = {
        id,
        version,
      };
    } else {
      clientProtocol = clientProtocolRaw;
    }

    // frame message is available only if the request is a POST request
    if (context.request.method !== "POST") {
      return nextInjectAcceptedClient({
        nextResult: next(),
        clientProtocol,
      });
    }

    const json = await cloneJsonBody(context.request);

    if (!json) {
      return nextInjectAcceptedClient({
        nextResult: next(),
        clientProtocol,
      });
    }

    if (!handler.isValidPayload(json)) {
      return nextInjectAcceptedClient({
        nextResult: next(),
        clientProtocol,
      });
    }

    const message = await handler.getFrameMessage(json);

    return nextInjectAcceptedClient({
      nextResult: next({
        message,
        clientProtocol,
      }),
      clientProtocol,
    });
  };
}
