import { ClientProtocolId } from "..";
import { RequestBodyNotJSONError } from "../core/errors";
import { FramesMiddleware, FramesMiddlewareReturnType } from "../core/types";
import { isFrameDefinition } from "../core/utils";

type OpenFrameMessage = any;

export type OpenFramesMessageContext<T = OpenFrameMessage> = {
  message?: Partial<T>;
  clientProtocol?: ClientProtocolId;
};

export type ClientProtocolHandler<T = OpenFrameMessage> = {
  // eslint-disable-next-line no-unused-vars
  getFrameMessage: (body: JSON) => Promise<T | undefined> | undefined;
  // eslint-disable-next-line no-unused-vars
  isValidPayload: (body: JSON) => boolean;
};

async function cloneJsonBody(request: Request): Promise<JSON | undefined> {
  try {
    // use clone just in case someone wants to read body somewhere along the way
    const body = await request
      .clone()
      .json()
      .catch(() => {
        throw new RequestBodyNotJSONError();
      });

    return body;
  } catch (e) {
    if (e instanceof RequestBodyNotJSONError) {
      return undefined;
    }

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
}) {
  const result = await nextResult;
  if (isFrameDefinition(result)) {
    return { ...result, accepts: [...(result.accepts || []), clientProtocol] };
  }
  return result;
}

export function openframes<T = OpenFrameMessage>({
  clientProtocol: clientProtocolRaw,
  handler,
}: {
  /**
   * Validator and and handler for frame messages from a supported client protocol.
   * `clientProtocol` is the ID of the client protocol in the form of a ClientProtocolId object or a string of the shape `"id@version"`
   * Handler is an object containing a frame message validator and handler
   * The output of the handler is added to the context as `message`
   */
  clientProtocol: ClientProtocolId | `${string}@${string}`;
  handler: ClientProtocolHandler<T>;
}): FramesMiddleware<any, OpenFramesMessageContext<T>> {
  return async (context, next) => {
    const clientProtocol: ClientProtocolId =
      typeof clientProtocolRaw === "string"
        ? {
            id: clientProtocolRaw.split("@")[0]!,
            version: clientProtocolRaw.split("@")[1]!,
          }
        : clientProtocolRaw;

    // frame message is available only if the request is a POST request
    if (context.request.method !== "POST") {
      return nextInjectAcceptedClient({
        nextResult: next(),
        clientProtocol: clientProtocol,
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

    return next({
      message,
      clientProtocol,
    });
  };
}
