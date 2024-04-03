import type { IncomingHttpHeaders } from "node:http";
import type {
  Handler as ExpressHandler,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import type { types } from "../core";
import { createFrames as coreCreateFrames } from "../core";
import {
  createReadableStreamFromReadable,
  writeReadableStreamToWritable,
} from "../lib/stream-pump";
import type { CoreMiddleware } from "../middleware";

export { Button, type types } from "../core";

type CreateFramesForExpress = types.CreateFramesFunctionDefinition<
  CoreMiddleware,
  ExpressHandler
>;

/**
 * Creates Frames instance to use with you Express.js server
 *
 * @example
 * ```tsx
 * import { createFrames, Button } from 'frames.js/express';
 * import express from 'express';
 *
 * const app = express();
 * const frames = createFrames();
 * const expressHandler = frames(async (ctx) => {
 *  return {
 *   image: <span>Test</span>,
 *    buttons: [
 *    <Button action="post">
 *      Click me
 *    </Button>,
 *  ],
 * };
 *
 * app.use("/", expressHandler);
 * ```
 */
// @ts-expect-error -- this code is correct just function doesn't satisfy the type
export const createFrames: CreateFramesForExpress =
  function createFramesForExpress(options?: types.FramesOptions<any, any>) {
    const frames = coreCreateFrames(options);

    return function expressFramesHandler<
      TPerRouteMiddleware extends types.FramesMiddleware<any, any>[],
    >(
      handler: types.FrameHandlerFunction<any, any>,
      handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
    ) {
      const framesHandler = frames(handler, handlerOptions);

      return function handleExpressRequest(
        req: ExpressRequest,
        res: ExpressResponse
      ) {
        // convert express.js req to Web API Request
        const response = framesHandler(createRequest(req, res));

        Promise.resolve(response)
          .then((resolvedResponse) => sendResponse(res, resolvedResponse))
          .catch((error) => {
            // eslint-disable-next-line no-console -- provide feedback
            console.error(error);
            res.writeHead(500, { "content-type": "text/plain" });
            res.end("Inernal server error");
          });
      };
    };
  };

function createRequest(req: ExpressRequest, res: ExpressResponse): Request {
  // req.hostname doesn't include port information so grab that from
  // `X-Forwarded-Host` or `Host`
  const [, hostnamePort] = req.get("X-Forwarded-Host")?.split(":") ?? [];
  const [, hostPort] = req.get("Host")?.split(":") ?? [];
  const port = hostnamePort || hostPort;
  // Use req.hostname here as it respects the "trust proxy" setting
  const resolvedHost = `${req.hostname}${port ? `:${port}` : ""}`;
  // Use `req.originalUrl` so Remix is aware of the full path
  const url = new URL(`${req.protocol}://${resolvedHost}${req.originalUrl}`);

  // Abort action/loaders once we can no longer write a response
  const controller = new AbortController();
  res.on("close", () => {
    controller.abort();
  });

  const init: RequestInit = {
    method: req.method,
    headers: convertIncomingHTTPHeadersToHeaders(req.headers),
    signal: controller.signal,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = createReadableStreamFromReadable(req);
    (init as { duplex: "half" }).duplex = "half";
  }

  return new Request(url.href, init);
}

function convertIncomingHTTPHeadersToHeaders(
  incomingHeaders: IncomingHttpHeaders
): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(incomingHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else if (value != null) {
      headers.append(key, value);
    }
  }

  return headers;
}

async function sendResponse(
  res: ExpressResponse,
  response: Response
): Promise<void> {
  res.statusMessage = response.statusText;
  res.status(response.status);

  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }

  if (response.body) {
    await writeReadableStreamToWritable(response.body, res);
  } else {
    res.end();
  }
}
