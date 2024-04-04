import type {
  IncomingMessage,
  IncomingHttpHeaders,
  ServerResponse,
} from "node:http";
import { Readable } from "node:stream";
import type { Socket } from "node:net";
import type { TLSSocket } from "node:tls";
import {
  createReadableStreamFromReadable,
  writeReadableStreamToWritable,
} from "./stream-pump";

function headerValue(
  header: string | string[] | undefined
): string | undefined {
  if (header === undefined) {
    return undefined;
  }

  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
}

/**
 * Incomming message uses TLSSocket if the request has been created by createServer from 'node:https' package.
 */
function isEncryptedSocket(socket: Socket | TLSSocket): boolean {
  return "encrypted" in socket && socket.encrypted;
}

/**
 * Converts Node.js request to Web API request.
 */
export function convertNodeJSRequestToWebAPIRequest(
  req: IncomingMessage,
  res: ServerResponse
): Request {
  /**
   * This header should never be an array as according to spec it should be a single value.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host
   */
  const host = headerValue(req.headers["x-forwarded-host"]) ?? req.headers.host;

  if (!host) {
    throw new TypeError(
      'Request headers must contain "host" or "x-forwarded-host" header'
    );
  }

  /**
   * This header should never be an array as according to spec it should be a single value.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto
   */
  const protocol =
    headerValue(req.headers["x-forwarded-proto"]) ||
    (isEncryptedSocket(req.socket) ? "https" : "http");

  let url: URL;
  const resolvedUrl = `${protocol}://${host}${req.url}`;

  try {
    url = new URL(resolvedUrl);
  } catch (e) {
    throw new TypeError(`Failed to resolve request URL. ${resolvedUrl}`);
  }

  // Abort action/loaders once we can no longer write a response
  const controller = new AbortController();

  res.on("close", () => {
    controller.abort();
  });

  const init: RequestInit = {
    method: req.method,
    headers: createRequestHeaders(req.headers),
    signal: controller.signal,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = createReadableStreamFromReadable(
      convertIncomingMessageToReadable(req)
    );
    (init as { duplex: "half" }).duplex = "half";
  }

  return new Request(url.href, init);
}

function createRequestHeaders(requestHeaders: IncomingHttpHeaders): Headers {
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

/**
 * Next.js / Express body parser consume request body and replaces them with the decoded value. The stream is then not readable anymore.
 *
 * This function handles such case and creates a Readable from the body if it's not readable.
 */
function convertIncomingMessageToReadable(req: IncomingMessage): Readable {
  if (req.method === "GET" || req.method === "HEAD") {
    throw new TypeError("GET and HEAD requests should not have a body");
  }

  if (!req.readable) {
    if (!("body" in req)) {
      throw new TypeError(
        "Request body is not available. If the request stream was consumed please assign a body with JSON serializable value to `req.body`"
      );
    }

    const readable = new Readable();

    readable.push(JSON.stringify(req.body));
    readable.push(null);

    return readable;
  }

  return req;
}

/**
 * Sends Web API response to Node.js response.
 */
export async function sendWebAPIResponseToNodeJSResponse(
  res: ServerResponse,
  response: Response
): Promise<void> {
  res.statusMessage = response.statusText;

  for (const [header, value] of response.headers.entries()) {
    res.setHeader(header, value);
  }

  res.writeHead(response.status, response.statusText);

  if (response.body) {
    await writeReadableStreamToWritable(response.body, res);
  } else {
    res.end();
  }
}
