import { InvalidFrameActionPayloadError, RequestBodyNotJSONError } from "../../core/errors";
import type { FramesMiddleware } from "../../core/types";
import type { ClientProtocolId, FrameActionPayload } from "../../types";
import type { ValidateFrameActionResponse } from "./types.message";

function isValidFrameActionPayload(
  value: unknown
): value is FrameActionPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "trustedData" in value &&
    "untrustedData" in value
  );
}

async function decodeFrameActionPayloadFromRequest(
  request: Request
): Promise<FrameActionPayload | undefined> {
  try {
    // use clone just in case someone wants to read body somewhere along the way
    const body = (await request
      .clone()
      .json()
      .catch(() => {
        throw new RequestBodyNotJSONError();
      })) as JSON;

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

    // eslint-disable-next-line no-console -- provide feedback to the developer
    console.error(e);

    return undefined;
  }
}

type FramesMessageContext = {
  message?: ValidateFrameActionResponse;
  clientProtocol?: ClientProtocolId;
};

type NeynarValidateOptions = {
  API_KEY: string;
};

export function neynarValidate(
  options?: NeynarValidateOptions
): FramesMiddleware<any, FramesMessageContext> {
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

    try {
      const message = (await fetch(
        "https://api.neynar.com/v2/farcaster/frame/validate",
        {
          method: "POST",
          headers: {
            accept: "application json",
            api_key: options?.API_KEY || "NEYNAR_API_DOCS",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            message_bytes_in_hex: payload.trustedData.messageBytes,
          }),
        }
      ).then(async (res) => res.json())) as ValidateFrameActionResponse;

      return next({
        message,
        clientProtocol: {
          id: "farcaster",
          version: "vNext",
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console -- provide feedback to the developer
      console.info(
        "neynarValidate middleware: could not decode farcaster message from payload, calling next."
      );
      return next();
    }
  };
}
