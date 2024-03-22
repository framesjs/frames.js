import { IncomingMessage } from "http";
import { NextApiRequest } from "next";
import type { NextRequest } from "next/server.js";

export function getCurrentUrl(
  req: Request | NextRequest | NextApiRequest | IncomingMessage
): URL | undefined {
  const scheme =
    process.env.VERCEL_ENV === "production" ? "https://" : "http://";
  const vercelUrl = process.env.VERCEL_URL;
  const host = vercelUrl || (req?.headers as any)?.host;

  const relativeUrl = req.url;

  return relativeUrl
    ? new URL(
        isValidUrl(relativeUrl) ? relativeUrl : scheme + host + relativeUrl
      )
    : undefined;
}

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}
