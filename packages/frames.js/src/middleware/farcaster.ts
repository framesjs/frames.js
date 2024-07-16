import type { ClientProtocolId, FrameActionPayload } from "../types";
import {
  type FrameMessageReturnType,
  getFrameMessage,
} from "../getFrameMessage";
import {
  InvalidFrameActionPayloadError,
  RequestBodyNotJSONError,
} from "../core/errors";
import type { FramesMiddleware, JsonValue } from "../core/types";
import type { MessageWithWalletAddressImplementation } from "./walletAddressMiddleware";

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
      })) as JsonValue;

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

type FrameMessage = Omit<
  FrameMessageReturnType<{ fetchHubContext: false }>,
  "message"
> & { state?: JsonValue } & MessageWithWalletAddressImplementation;

type FramesMessageContext = {
  message?: FrameMessage;
  clientProtocol?: ClientProtocolId;
};

export function farcaster(): FramesMiddleware<any, FramesMessageContext> {
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
      const message = await getFrameMessage(payload, {
        fetchHubContext: false,
      });

      return next({
        message: {
          ...message,
          walletAddress() {
            // eslint-disable-next-line no-console -- provide feedback to the developer
            console.info(
              "farcaster middleware: walletAddress() called, please ue farcasterHubContext() middleware if you want to access the wallet address"
            );

            return Promise.resolve(undefined);
          },
        },
        clientProtocol: {
          id: "farcaster",
          version: "vNext",
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console -- provide feedback to the developer
      console.info(
        "farcaster middleware: could not decode farcaster message from payload, calling next."
      );
      return next();
    }
  };
}
