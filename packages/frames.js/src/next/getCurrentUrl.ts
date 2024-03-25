import { IncomingMessage } from "http";
import { NextApiRequest } from "next";
import type { NextRequest } from "next/server.js";

export function getCurrentUrl(
  req: Request | NextRequest | NextApiRequest | IncomingMessage
): URL | undefined {
  const scheme = process.env.NODE_ENV === "production" ? "https://" : "http://";
  const appUrl = process.env.VERCEL_URL || process.env.APP_URL;
  const host: string | undefined = (req.headers as any)?.host;

  const pathname = req.url?.startsWith("/")
    ? req.url
    : req.url
      ? new URL(req.url).pathname + new URL(req.url).search
      : "";

  // Construct a valid URL from the Vercel URL environment variable if it exists
  const parsedAppUrl = appUrl
    ? appUrl.startsWith("http://") || appUrl.startsWith("https://")
      ? new URL(pathname, appUrl)
      : new URL(pathname, scheme + appUrl)
    : undefined;

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

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}
