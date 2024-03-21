import { createFrames as coreCreateFrames } from "@frames.js/core";
import { Metadata, NextApiRequest, NextApiResponse } from "next";
export { Button, type types } from "@frames.js/core";
import type { Writable, Readable } from "node:stream";
import { Stream } from "node:stream";

export { fetchMetadata } from "./fetchMetadata";

export const createFrames: typeof coreCreateFrames =
  function createFramesForNextJSPagesRouter(options: any) {
    const frames = coreCreateFrames(options);

    // @ts-expect-error
    return function createHandler(handler, handlerOptions) {
      const requestHandler = frames(handler, handlerOptions);

      return async function handleNextJSApiRequest(
        req: NextApiRequest,
        res: NextApiResponse
      ) {
        const response = await requestHandler(createRequest(req, res));
        await sendResponse(res, response);
      };
    };
  } as unknown as typeof coreCreateFrames;

/**
 * Converts metadata returned from fetchMetadata() call to Next.js <Head /> compatible components.
 *
 * @example
 * import { fetchMetadata, metadataToMetaTags } from "@frames.js/next/pages-router";
 *
 * export const getServerSideProps = async function getServerSideProps() {
 *  return {
 *   props: {
 *    metadata: await fetchMetadata(
 *     new URL("/api", process.env.VERCEL_URL || "http://localhost:3000")
 *    ),
 *  },
 * };
 *
 * export default function Page({
 *  metadata,
 * }: InferGetServerSidePropsType<typeof getServerSideProps>) {
 *  return (
 *    <>
 *      <Head>
 *        <title>Frames.js app</title>
 *        {metadataToMetaTags(metadata)}
 *      </Head>
 *    </>
 *  );
 * }
 */
export function metadataToMetaTags(metadata: NonNullable<Metadata["other"]>) {
  return (
    <>
      {Object.entries(metadata).map(([key, value]) => {
        if (typeof value === "string") {
          return <meta name={key} key={key} content={value} />;
        }

        return null;
      })}
    </>
  );
}

function createRequest(req: NextApiRequest, res: NextApiResponse): Request {
  // req.hostname doesn't include port information so grab that from
  // `X-Forwarded-Host` or `Host`
  const xForwardedHost = req.headers["x-forwarded-host"];
  const normalizedXForwardedHost = Array.isArray(xForwardedHost)
    ? xForwardedHost[0]
    : xForwardedHost;
  let [, hostnamePort] = normalizedXForwardedHost?.split(":") ?? [];
  let [, hostPort] = req.headers["host"]?.split(":") ?? [];
  let port = hostnamePort || hostPort;
  // Use req.hostname here as it respects the "trust proxy" setting
  let resolvedHost = `${req.headers["host"]}${port ? `:${port}` : ""}`;
  // Use `req.url` so NextJS is aware of the full path
  let url = new URL(
    `${"encrypted" in req.socket && req.socket.encrypted ? "https" : "http"}://${resolvedHost}${req.url}`
  );

  // Abort action/loaders once we can no longer write a response
  let controller = new AbortController();
  res.on("close", () => controller.abort());

  let init: RequestInit = {
    method: req.method,
    headers: createRequestHeaders(req.headers),
    signal: controller.signal,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = createReadableStreamFromReadable(req);
    (init as { duplex: "half" }).duplex = "half";
  }

  return new Request(url.href, init);
}

export function createRequestHeaders(
  requestHeaders: NextApiRequest["headers"]
): Headers {
  let headers = new Headers();

  for (let [key, values] of Object.entries(requestHeaders)) {
    if (values) {
      if (Array.isArray(values)) {
        for (let value of values) {
          headers.append(key, value);
        }
      } else {
        headers.set(key, values);
      }
    }
  }

  return headers;
}

async function sendResponse(res: NextApiResponse, response: Response) {
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
