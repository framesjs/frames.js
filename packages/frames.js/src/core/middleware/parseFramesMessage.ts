import {
  FrameActionPayload,
  FrameMessageReturnType,
  getFrameMessage,
} from "../..";
import { FramesMiddleware } from "../types";

class RequestBodyNotJSONError extends Error {
  constructor() {
    super("Invalid frame action payload");
  }
}

class InvalidFrameActionPayloadError extends Error {
  constructor() {
    super("Invalid frame action payload");
  }
}

function isValidFrameActionPayload(value: any): value is FrameActionPayload {
  return (
    value &&
    typeof value === "object" &&
    "trustedData" in value &&
    "untrustedData" in value
  );
}

async function decodeFrameActionPayloadFromRequest(
  request: Request
): Promise<FrameActionPayload | undefined> {
  try {
    // use clone just in case someone wants to read body somewhere along the way
    const body = await request
      .clone()
      .json()
      .catch(() => {
        throw new RequestBodyNotJSONError();
      });

    if (!isValidFrameActionPayload(body)) {
      throw new InvalidFrameActionPayloadError();
    }

    return body;
  } catch (e) {
    if (
      e instanceof RequestBodyNotJSONError ||
      e instanceof InvalidFrameActionPayloadError
    ) {
      return undefined;
    }

    console.error(e);

    return undefined;
  }
}

type FramesMessageContext = {
  message?: FrameMessageReturnType<{ fetchHubContext: false }>;
};

export function parseFramesMessage(): FramesMiddleware<FramesMessageContext> {
  return async (context, next) => {
    // frame message is available only if the request is a POST request
    if (context.request.method !== "POST") {
      return next();
    }

    // body must be a JSON object
    const payload = await decodeFrameActionPayloadFromRequest(context.request);

    if (!payload) {
      return next();
    }

    // We don't fetch hub context here, that should be probably added by some different middleware so
    // user can decide exactly what they want.
    const message = await getFrameMessage(payload, { fetchHubContext: false });

    return next({
      message,
    });
  };
}