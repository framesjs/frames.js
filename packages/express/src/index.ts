import {
  DefaultMiddleware,
  createFrames as coreCreateFrames,
  types,
} from "@frames.js/core";
export { Button, type types } from "@frames.js/core";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
  Handler as ExpressHandler,
} from "express";
import type { IncomingHttpHeaders } from "node:http";
import type { Writable, Readable } from "node:stream";
import { Stream } from "node:stream";

type CreateFramesForExpress = types.CreateFramesFunctionDefinition<
  DefaultMiddleware,
  ExpressHandler
>;

/**
 * Creates Frames instance to use with you Express.js server
 *
 * @example
 * import { createFrames, Button } from '@frames.js/express';
 * import express from 'express';
 *
 * const app = express();
 * const frames = createFrames();
 * const expressHandler = frames(async ({ request }) => {
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
 */
export const createFrames: CreateFramesForExpress =
  function createFramesForExpress(options?: types.FramesOptions<any>) {
    const frames = coreCreateFrames(options);

    return function expressFramesHandler<
      TPerRouteMiddleware extends types.FramesMiddleware<any>[],
    >(
      handler: types.FrameHandlerFunction<any>,
      handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
    ) {
      const framesHandler = frames(handler, handlerOptions);

      return async function handleExpressRequest(
        req: ExpressRequest,
        res: ExpressResponse
      ) {
        // convert express.js req to Web API Request

        const response = await framesHandler(createRequest(req, res));

        sendResponse(res, response);
      };
    };
  };

function createRequest(req: ExpressRequest, res: ExpressResponse): Request {
  // req.hostname doesn't include port information so grab that from
  // `X-Forwarded-Host` or `Host`
  const [, hostnamePort] = req.get("X-Forwarded-Host")?.split(":") ?? [];
  const [, hostPort] = req.get("Host")?.split(":") ?? [];
  let port = hostnamePort || hostPort;
  // Use req.hostname here as it respects the "trust proxy" setting
  let resolvedHost = `${req.hostname}${port ? `:${port}` : ""}`;
  // Use `req.originalUrl` so Remix is aware of the full path
  let url = new URL(`${req.protocol}://${resolvedHost}${req.originalUrl}`);

  // Abort action/loaders once we can no longer write a response
  let controller = new AbortController();
  res.on("close", () => controller.abort());

  let init: RequestInit = {
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

async function sendResponse(res: ExpressResponse, response: Response) {
  res.statusMessage = response.statusText;
  res.status(response.status);

  for (let [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }

  if (response.body) {
    await writeReadableStreamToWritable(response.body, res);
  } else {
    res.end();
  }
}
class StreamPump {
  public highWaterMark: number;
  public accumalatedSize: number;
  private stream: Stream & {
    readableHighWaterMark?: number;
    readable?: boolean;
    resume?: () => void;
    pause?: () => void;
    destroy?: (error?: Error) => void;
  };
  private controller?: ReadableStreamController<Uint8Array>;

  constructor(
    stream: Stream & {
      readableHighWaterMark?: number;
      readable?: boolean;
      resume?: () => void;
      pause?: () => void;
      destroy?: (error?: Error) => void;
    }
  ) {
    this.highWaterMark =
      stream.readableHighWaterMark ||
      new Stream.Readable().readableHighWaterMark;
    this.accumalatedSize = 0;
    this.stream = stream;
    this.enqueue = this.enqueue.bind(this);
    this.error = this.error.bind(this);
    this.close = this.close.bind(this);
  }

  size(chunk: Uint8Array) {
    return chunk?.byteLength || 0;
  }

  start(controller: ReadableStreamController<Uint8Array>) {
    this.controller = controller;
    this.stream.on("data", this.enqueue);
    this.stream.once("error", this.error);
    this.stream.once("end", this.close);
    this.stream.once("close", this.close);
  }

  pull() {
    this.resume();
  }

  cancel(reason?: Error) {
    if (this.stream.destroy) {
      this.stream.destroy(reason);
    }

    this.stream.off("data", this.enqueue);
    this.stream.off("error", this.error);
    this.stream.off("end", this.close);
    this.stream.off("close", this.close);
  }

  enqueue(chunk: Uint8Array | string) {
    if (this.controller) {
      try {
        let bytes = chunk instanceof Uint8Array ? chunk : Buffer.from(chunk);

        let available = (this.controller.desiredSize || 0) - bytes.byteLength;
        this.controller.enqueue(bytes);
        if (available <= 0) {
          this.pause();
        }
      } catch (error: any) {
        this.controller.error(
          new Error(
            "Could not create Buffer, chunk must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object"
          )
        );
        this.cancel();
      }
    }
  }

  pause() {
    if (this.stream.pause) {
      this.stream.pause();
    }
  }

  resume() {
    if (this.stream.readable && this.stream.resume) {
      this.stream.resume();
    }
  }

  close() {
    if (this.controller) {
      this.controller.close();
      delete this.controller;
    }
  }

  error(error: Error) {
    if (this.controller) {
      this.controller.error(error);
      delete this.controller;
    }
  }
}

export const createReadableStreamFromReadable = (
  source: Readable & { readableHighWaterMark?: number }
) => {
  let pump = new StreamPump(source);
  let stream = new ReadableStream(pump, pump);
  return stream;
};

export async function writeReadableStreamToWritable(
  stream: ReadableStream,
  writable: Writable
) {
  let reader = stream.getReader();
  let flushable = writable as { flush?: Function };

  try {
    while (true) {
      let { done, value } = await reader.read();

      if (done) {
        writable.end();
        break;
      }

      writable.write(value);
      if (typeof flushable.flush === "function") {
        flushable.flush();
      }
    }
  } catch (error: unknown) {
    writable.destroy(error as Error);
    throw error;
  }
}
