import type { Metadata, NextApiRequest, NextApiResponse } from "next";
import React from "react";
import { createFrames as coreCreateFrames } from "../core";
import {
  createReadableStreamFromReadable,
  writeReadableStreamToWritable,
} from "../lib/stream-pump";
export { Button, type types } from "../core";

export { fetchMetadata } from "./fetchMetadata";

export const createFrames: typeof coreCreateFrames =
  function createFramesForNextJSPagesRouter(options: any) {
    const frames = coreCreateFrames(options);

    // @ts-expect-error -- this is correct but the function does not satisfy the type
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
 * ```tsx
 * import { fetchMetadata, metadataToMetaTags } from "frames.js/next/pages-router";
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
 * ```
 */
export function metadataToMetaTags(metadata: NonNullable<Metadata["other"]>): React.JSX.Element {
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
  let resolvedHost = `${req.headers["host"]}${!hostPort ? `:${port}` : ""}`;
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
  const headers = new Headers();

  for (const [key, values] of Object.entries(requestHeaders)) {
    if (values) {
      if (Array.isArray(values)) {
        for (const value of values) {
          headers.append(key, value);
        }
      } else {
        headers.set(key, values);
      }
    }
  }

  return headers;
}

async function sendResponse(res: NextApiResponse, response: Response): Promise<void> {
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
