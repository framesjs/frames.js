import { ClientProtocolId } from "../..";
import { RequestBodyNotJSONError } from "../errors";
import { FramesMiddleware, FramesMiddlewareReturnType } from "../types";
import { isFrameDefinition } from "../utils";

type FramesMessageContext = {
  // TODO: this should extend a base FrameMessage with common fields
  message?: any;
  clientProtocol?: string;
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

async function nextInjectClientProtocols({
  nextResult,
  accepts,
}: {
  nextResult: FramesMiddlewareReturnType;
  accepts: ClientProtocolId[];
}) {
  const result = await nextResult;
  if (isFrameDefinition(result)) {
    return { ...result, accepts };
  }
  return result;
}

export function openframes({
  clientProtocolHandlers: handlers,
}: {
  /**
   * Validators and handlers for frame messages from different client protocols.
   * Key is the client protocol ID (e.g. "id@version")
   * Value is an object containing a frame message validator and handler
   * The output of the handler is added to the context as `message`
   */
  clientProtocolHandlers: Record<
    string,
    {
      // TODO: better types
      getFrameMessage: (body: JSON) => Promise<any | undefined> | undefined;
      isValidPayload: (body: JSON) => Boolean;
    }
  >;
}): FramesMiddleware<FramesMessageContext> {
  return async (context, next) => {
    const accepts: ClientProtocolId[] = Object.keys(handlers)
      .map((clientProtocol) => {
        const [id, version] = clientProtocol.split("@");
        if (!id || !version) {
          return undefined;
        }

        return { id, version };
      })
      .filter(Boolean) as ClientProtocolId[];

    // frame message is available only if the request is a POST request
    if (context.request.method !== "POST") {
      return nextInjectClientProtocols({ nextResult: next(), accepts });
    }

    const json = await cloneJsonBody(context.request);

    if (!json) {
      return nextInjectClientProtocols({ nextResult: next(), accepts });
    }

    // Find first handler with key
    const clientHandler = Object.entries(handlers).find(([, handler]) => {
      return handler.isValidPayload(json);
    });

    if (!clientHandler) {
      return nextInjectClientProtocols({ nextResult: next(), accepts });
    }

    const [clientProtocol, handler] = clientHandler;

    const message = await handler.getFrameMessage(json);

    return next({
      message,
      clientProtocol,
    });
  };
}
