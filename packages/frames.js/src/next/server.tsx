import { FrameActionMessage } from "@farcaster/core";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { validateFrameMessage } from "../";
import { FrameActionPayload, HubHttpUrlOptions } from "../types";
import { NextServerPageProps } from "./types";
import {
  FrameState,
  PreviousFrame,
  RedirectHandler,
  RedirectMap,
} from "../common";
import { createPreviousFrame } from "../common";

export * from "./types";

/** validates a frame action message payload signature, @returns message, throws an Error on failure */
export async function validateActionSignature(
  frameActionPayload: FrameActionPayload | null,
  options?: HubHttpUrlOptions
): Promise<FrameActionMessage | null> {
  if (options?.hubHttpUrl) {
    if (!options.hubHttpUrl.startsWith("http")) {
      throw new Error(
        `frames.js: Invalid Hub URL: ${options?.hubHttpUrl}, ensure you have included the protocol (e.g. https://)`
      );
    }
  }

  if (!frameActionPayload) {
    // no payload means no action
    return null;
  }

  const { isValid, message } = await validateFrameMessage(
    frameActionPayload,
    options
  );

  if (!isValid || !message) {
    throw new Error("frames.js: signature failed verification");
  }

  return message;
}

/** deserializes a `PreviousFrame` from url searchParams, fetching headers automatically from nextjs, @returns PreviousFrame */
export function getPreviousFrame<T extends FrameState = FrameState>(
  searchParams: NextServerPageProps["searchParams"]
): PreviousFrame<T> {
  const headersObj = headers();
  // not sure about the security of doing this for server only headers.
  // const headersList = Object.fromEntries(headers().entries());
  const headersList = {
    userAgent: headersObj.get("user-agent"),
    acceptLanguage: headersObj.get("accept-language"),
    host: headersObj.get("host"),
    pathname: headersObj.get("next-url") ?? "",
    urlWithoutPathname: `${headersObj.get("x-forwarded-proto")}://${headersObj.get("x-forwarded-host")}`,
    url:
      headersObj.get("referer") ||
      `${headersObj.get("x-forwarded-proto")}://${headersObj.get("x-forwarded-host")}${headersObj.get("next-url") ?? ""}`,
  };

  return createPreviousFrame(parseFrameParams<T>(searchParams), headersList);
}

/** deserializes data stored in the url search params and @returns a Partial PreviousFrame object  */
export function parseFrameParams<T extends FrameState = FrameState>(
  searchParams: NextServerPageProps["searchParams"]
): Pick<
  PreviousFrame<T>,
  "postBody" | "prevState" | "pathname" | "prevRedirects"
> {
  const frameActionReceived: FrameActionPayload | null =
    searchParams?.postBody && typeof searchParams?.postBody === "string"
      ? JSON.parse(searchParams?.postBody)
      : null;

  const framePrevState: T | null =
    searchParams?.prevState && typeof searchParams?.prevState === "string"
      ? JSON.parse(searchParams?.prevState)
      : null;

  const framePrevRedirects: RedirectMap | null =
    searchParams?.prevRedirects &&
    typeof searchParams?.prevRedirects === "string"
      ? JSON.parse(searchParams?.prevRedirects)
      : null;

  const pathname =
    searchParams?.pathname && typeof searchParams?.pathname === "string"
      ? searchParams?.pathname
      : undefined;

  return {
    postBody: frameActionReceived,
    prevState: framePrevState,
    pathname: pathname,
    prevRedirects: framePrevRedirects,
  };
}

/**
 * A function ready made for next.js in order to directly export it, which handles all incoming `POST` requests that apps will trigger when users press buttons in your Frame.
 * It handles all the redirecting for you, correctly, based on the <FrameContainer> props defined by the Frame that triggered the user action.
 * @param req a `NextRequest` object from `next/server` (Next.js app router server components)
 * @returns NextResponse
 */
export async function POST(
  req: NextRequest,
  /** unused, but will most frequently be passed a res: NextResponse object. Should stay in here for easy consumption compatible with next.js */
  _: NextResponse,
  redirectHandler?: RedirectHandler
) {
  const body = await req.json();

  const url = new URL(req.url);
  url.pathname = url.searchParams.get("p") || "";

  // decompress from 256 bytes limitation of post_url
  url.searchParams.set("postBody", JSON.stringify(body));
  url.searchParams.set("prevState", url.searchParams.get("s") ?? "");
  url.searchParams.set("prevRedirects", url.searchParams.get("r") ?? "");
  // was used to redirect to the correct page, and is no longer needed.
  url.searchParams.delete("p");
  url.searchParams.delete("s");
  url.searchParams.delete("r");

  const prevFrame = getPreviousFrame(
    Object.fromEntries(url.searchParams.entries())
  );

  // Handle 'post_redirect' buttons with href values
  if (
    prevFrame.postBody?.untrustedData.buttonIndex &&
    prevFrame.prevRedirects?.hasOwnProperty(
      prevFrame.postBody?.untrustedData.buttonIndex
    ) &&
    prevFrame.prevRedirects[prevFrame.postBody?.untrustedData.buttonIndex]
  ) {
    return NextResponse.redirect(
      prevFrame.prevRedirects[
        `${prevFrame.postBody?.untrustedData.buttonIndex}`
      ]!,
      { status: 302 }
    );
  }
  // Handle 'post_redirect' buttons without defined href values
  if (
    prevFrame.postBody?.untrustedData.buttonIndex &&
    prevFrame.prevRedirects?.hasOwnProperty(
      `_${prevFrame.postBody?.untrustedData.buttonIndex}`
    )
  ) {
    if (!redirectHandler) {
      // Error!
      return NextResponse.json(
        {
          message:
            "frames.js: You need to define either an href property on your FrameButton that has a `redirect` prop, or pass a third argument to `POST`",
        },
        {
          status: 500,
          statusText:
            "frames.js: You need to define either an href property on your FrameButton that has a `redirect` prop, or pass a third argument to `POST`",
        }
      );
    }
    const redirectValue = redirectHandler(prevFrame);
    if (redirectValue === undefined) {
      // Error!
      return NextResponse.json(
        {
          message:
            "frames.js: Your framesReducer (Second argument of POST) returned undefined when it needed to return a url",
        },
        {
          status: 500,
          statusText:
            "frames.js: Your framesReducer (Second argument of POST) returned undefined when it needed to return a url",
        }
      );
    }

    return NextResponse.redirect(redirectValue, { status: 302 });
  }

  // handle 'post' buttons
  return NextResponse.redirect(url.toString(), { status: 302 });
}
