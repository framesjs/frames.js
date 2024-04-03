import type { IncomingMessage } from "node:http";
import type { NextApiRequest } from "next";
import type { NextRequest } from "next/server.js";

export function getCurrentUrl(
  req: Request | NextRequest | NextApiRequest | IncomingMessage
): URL | undefined {
  const scheme = process.env.NODE_ENV === "production" ? "https://" : "http://";
  const appUrl = process.env.APP_URL || process.env.VERCEL_URL;
  const host: string | undefined = (
    req.headers as unknown as Record<string, string> | undefined
  )?.host;

  let pathname: string;

  if (req.url?.startsWith("/")) {
    pathname = req.url;
  } else if (req.url) {
    const url = new URL(req.url);
    pathname = url.pathname + url.search;
  } else {
    pathname = "";
  }

  // Construct a valid URL from the Vercel URL environment variable if it exists
  let parsedAppUrl: URL | undefined;

  if (appUrl) {
    if (appUrl.startsWith("http://") || appUrl.startsWith("https://")) {
      parsedAppUrl = new URL(pathname, appUrl);
    } else {
      parsedAppUrl = new URL(pathname, scheme + appUrl);
    }
  }

  // App URL
  if (parsedAppUrl) {
    return parsedAppUrl;
  }

  // Request URL
  if (req.url && isValidUrl(req.url)) {
    return new URL(req.url);
  }

  // Relative URLs
  if (host && req.url?.startsWith("/")) {
    return new URL(`${scheme}${host}${req.url}`);
  }

  return undefined;
}

function isValidUrl(url: string): boolean {
  try {
    // eslint-disable-next-line no-new -- constructor will validate the URL
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}
