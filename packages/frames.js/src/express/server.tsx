import { Request, Response } from "express";
import {
  FrameState,
  HeadersList,
  PreviousFrame,
  RedirectHandler,
} from "../common/server";
import { createPreviousFrame } from "../common/server";
export * from "./types";

function buildHeadersList(req: Request): HeadersList {
  return {
    userAgent: req.headers["user-agent"] || null,
    acceptLanguage: req.headers["accept-language"] || null,
    host: req.headers.host || null,
    pathname: req.path,
    urlWithoutPathname: `${req.protocol}://${req.get("host")}`,
    url:
      req.get("referer") ||
      `${req.protocol}://${req.get("host")}${req.originalUrl}`,
  };
}

export function getPreviousFrame<T extends FrameState = FrameState>(
  req: Request
): PreviousFrame<T> {
  return createPreviousFrame(parseFrameParams(req), buildHeadersList(req));
}

function parseFrameParams(req: Request) {
  const { postBody, prevState, prevRedirects, pathname } =
    req.method === "POST" ? req.body : req.query;
  return {
    postBody:
      postBody && typeof postBody === "string" ? JSON.parse(postBody) : null,
    prevState:
      prevState && typeof prevState === "string" ? JSON.parse(prevState) : null,
    prevRedirects:
      prevRedirects && typeof prevRedirects === "string"
        ? JSON.parse(prevRedirects)
        : null,
    pathname,
  };
}

export async function POST(
  req: Request,
  res: Response,
  redirectHandler?: RedirectHandler
) {
  const { p, s, r } = req.query;
  const body = req.body;

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const url = new URL(baseUrl + req.originalUrl);

  url.pathname = typeof p === "string" ? p : "";
  url.searchParams.set("postBody", JSON.stringify(body));
  url.searchParams.set("prevState", String(s) || "");
  url.searchParams.set("prevRedirects", String(r) || "");
  url.searchParams.delete("p");
  url.searchParams.delete("s");
  url.searchParams.delete("r");

  const prevFrame = getPreviousFrame(req);

  const redirectKey = prevFrame.postBody?.untrustedData.buttonIndex;
  if (!redirectKey) {
    return res.status(500).json({ message: "buttonIndex is required" });
  }

  const redirectUrl =
    prevFrame.prevRedirects?.[redirectKey] ||
    prevFrame.prevRedirects?.[`_${redirectKey}`];

  if (redirectUrl) {
    return res.redirect(302, redirectUrl);
  }

  if (!redirectHandler) {
    return res
      .status(500)
      .json({ message: "Redirect handler required for dynamic redirects." });
  }

  const redirectValue = redirectHandler(prevFrame);
  if (redirectValue === undefined) {
    return res
      .status(500)
      .json({ message: "Redirect handler failed to provide a valid URL." });
  }

  return res.redirect(302, redirectValue);
}
