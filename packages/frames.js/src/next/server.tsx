import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { getByteLength, validateFrameMessage } from "..";
import { ActionIndex, FrameActionPayload } from "../types";
import { FrameActionMessage } from "@farcaster/core";
// Todo: this isn't respecting the use client directive
import { FrameButtonRedirectUI, FrameButtonUI } from "./client";
import {
  Dispatch,
  FrameButtonAutomatedProps,
  FrameButtonPostProvidedProps,
  FrameButtonPostRedirectProvidedProps,
  FrameButtonProvidedProps,
  FrameReducer,
  FrameState,
  HeadersList,
  PreviousFrame,
  RedirectMap,
} from "./types";
export * from "./types";

/** The valid children of a <FrameContainer> */
export type FrameElementType =
  | typeof FrameButton
  | typeof FrameImage
  | typeof FrameInput;

/** validates a frame action message payload signature, @returns message, throws an Error on failure */
export async function validateActionSignature(
  frameActionPayload: FrameActionPayload | null
): Promise<FrameActionMessage | null> {
  if (!frameActionPayload) {
    // no payload means no action
    return null;
  }
  const { isValid, message } = await validateFrameMessage(frameActionPayload);

  if (!isValid || !message) {
    throw new Error("frames.js: signature failed verification");
  }

  return message;
}

/** deserializes a `PreviousFrame` from url searchParams, fetching headers automatically from nextjs, @returns PreviousFrame */
export function getPreviousFrame<T extends FrameState = FrameState>(
  searchParams: Record<string, string>
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

/** @returns PreviousFrame by combining headers and previousFrames from params */
export function createPreviousFrame<T extends FrameState = FrameState>(
  previousFrameFromParams: Pick<
    PreviousFrame<T>,
    "postBody" | "prevState" | "pathname" | "prevRedirects"
  >,
  headers: HeadersList
): PreviousFrame<T> {
  return {
    ...previousFrameFromParams,
    headers: headers,
  };
}

/** deserializes data stored in the url search params and @returns a Partial PreviousFrame object  */
export function parseFrameParams<T extends FrameState = FrameState>(
  searchParams: Record<string, string>
): Pick<
  PreviousFrame<T>,
  "postBody" | "prevState" | "pathname" | "prevRedirects"
> {
  const frameActionReceived = searchParams.postBody
    ? (JSON.parse(searchParams.postBody) as FrameActionPayload)
    : null;

  const framePrevState = searchParams.prevState
    ? (JSON.parse(searchParams.prevState) as T)
    : null;

  const framePrevRedirects = searchParams.prevRedirects
    ? (JSON.parse(searchParams.prevRedirects) as RedirectMap)
    : null;

  return {
    postBody: frameActionReceived,
    prevState: framePrevState,
    pathname: searchParams.pathname,
    prevRedirects: framePrevRedirects,
  };
}

/**
 *
 * @param reducer a function taking a state and action and returning another action. This reducer is always called in the Frame to compute the state by calling it with the previous Frame + action
 * @param initialState the initial state to use if there was no previous action
 * @param initializerArg the previousFrame object to use to initialize the state
 * @returns An array of [State, Dispatch] where State is your reducer state, and dispatch is a function that doesn't do anything atm
 */
export function useFramesReducer<T extends FrameState = FrameState>(
  reducer: FrameReducer<T>,
  initialState: T,
  initializerArg: PreviousFrame<T>
): [T, Dispatch] {
  function frameReducerInit(initial: PreviousFrame<T>): T {
    if (initial.prevState === null || initial.postBody === null)
      return initialState;

    return reducer(initial.prevState, initial);
  }

  // doesn't do anything right now, but exists to make Button onClicks feel more natural and not magic.
  function dispatch(actionIndex: ActionIndex) {}

  return [frameReducerInit(initializerArg), dispatch];
}

/**
 * A function ready made for next.js in order to directly export it, which handles all incoming `POST` requests that apps will trigger when users press buttons in your Frame.
 * It handles all the redirecting for you, correctly, based on the <FrameContainer> props defined by the Frame that triggered the user action.
 * @param req a `NextRequest` object from `next/server` (Next.js app router server components)
 * @returns NextResponse
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  const url = new URL(req.url);
  url.pathname = url.searchParams.get("p") || "/";

  const bodyAsString = JSON.stringify(body);

  // decompress from 256 bytes limitation of post_url
  url.searchParams.set("postBody", bodyAsString);
  url.searchParams.set("prevState", url.searchParams.get("s") ?? "");
  url.searchParams.set("prevRedirects", url.searchParams.get("r") ?? "");
  // was used to redirect to the correct page, and is no longer needed.
  url.searchParams.delete("p");
  url.searchParams.delete("s");
  url.searchParams.delete("r");

  const parsedParams = parseFrameParams(
    Object.fromEntries(url.searchParams.entries())
  );

  if (
    parsedParams.postBody?.untrustedData.buttonIndex &&
    parsedParams.prevRedirects?.hasOwnProperty(
      parsedParams.postBody?.untrustedData.buttonIndex
    ) &&
    parsedParams.prevRedirects[parsedParams.postBody?.untrustedData.buttonIndex]
  ) {
    return NextResponse.redirect(
      parsedParams.prevRedirects[
        `${parsedParams.postBody?.untrustedData.buttonIndex}`
      ]!,
      { status: 302 }
    );
  }

  return NextResponse.redirect(url.toString());
}

/**
 * A React functional component that Wraps a Frame and processes it, validating certain properties of the Frames spec, as well as adding other props. It also generates the postUrl.
 * It throws an error if the Frame is invalid, which can be caught by using an error boundary.
 * @param param0
 * @returns React.JSXElement
 */
export function FrameContainer<T extends FrameState = FrameState>({
  postUrl,
  children,
  state,
  previousFrame,
}: {
  /** Either a relative e.g. "/frames" or an absolute path, e.g. "https://google.com/frames" */
  postUrl: string;
  /** The elements to include in the Frame */
  children: Array<React.ReactElement<FrameElementType> | null>;
  /** The current reducer state object, returned from useFramesReducer */
  state: T;
  previousFrame: PreviousFrame<T>;
}) {
  const nextIndexByComponentType: Record<
    "button" | "image" | "input",
    ActionIndex
  > = {
    button: 1,
    image: 1,
    input: 1,
  };
  let redirectMap: RedirectMap = {};
  const newTree = (
    <>
      {React.Children.map(children, (child) => {
        if (child === null) return;
        switch (child.type) {
          case FrameButton:
            if (!React.isValidElement<typeof FrameButton>(child)) {
              return child;
            }

            if (nextIndexByComponentType.button > 4) {
              throw new Error("too many buttons");
            }

            if (child.props.hasOwnProperty("href")) {
              if (child.props.hasOwnProperty("onClick")) {
                throw new Error(
                  "buttons must either have href or onClick, not both"
                );
              }
              redirectMap[nextIndexByComponentType.button] = // TODO?
                (
                  child.props as any as FrameButtonPostRedirectProvidedProps
                ).href;
              return (
                <FrameRedirect
                  {...(child.props as any)}
                  actionIndex={nextIndexByComponentType.button++}
                />
              );
            } else {
              return (
                <FFrameButtonShim
                  {...(child.props as any)}
                  actionIndex={nextIndexByComponentType.button++}
                />
              );
            }
          case FrameInput:
            if (nextIndexByComponentType.input > 1) {
              throw new Error("max one input allowed");
            }
            nextIndexByComponentType.input++;
            return child;
          case FrameImage:
            if (nextIndexByComponentType.image > 1) {
              throw new Error("max one image allowed");
            }
            nextIndexByComponentType.image++;
            return child;
          default:
            throw new Error(
              "invalid child of <Frame>, must be a <FrameButton> or <FrameImage>"
            );
        }
      })}
    </>
  );

  if (nextIndexByComponentType.image === 1)
    throw new Error("an <FrameImage> element inside a <Frame> is required");

  const searchParams = new URLSearchParams();

  // short for pathname
  searchParams.set("p", previousFrame.headers.pathname ?? "/");
  // short for state
  searchParams.set("s", JSON.stringify(state));
  // short for redirects
  searchParams.set("r", JSON.stringify(redirectMap));

  const postUrlRoute = postUrl.startsWith("/")
    ? `${previousFrame.headers.urlWithoutPathname}${postUrl}`
    : postUrl;

  const postUrlFull = `${postUrlRoute}?${searchParams.toString()}`;
  if (getByteLength(postUrlFull) > 256) {
    console.error(`post_url is too long: `, postUrlFull);
    throw new Error("post_url is more than 256 bytes");
  }
  return (
    <>
      <meta name="fc:frame" content="vNext" />
      <meta name="fc:frame:post_url" content={postUrlFull} />
      {newTree}
    </>
  );
}

/** An internal component that handles redirects */
function FrameRedirect({
  href,
  actionIndex,
  children,
}: FrameButtonPostRedirectProvidedProps & FrameButtonAutomatedProps) {
  return (
    <>
      {process.env.SHOW_UI ? (
        <FrameButtonRedirectUI actionIndex={actionIndex} href={href}>
          {children}
        </FrameButtonRedirectUI>
      ) : null}
      <meta
        name={`fc:frame:button:${actionIndex}`}
        content={String(children)}
      />
      <meta
        name={`fc:frame:button:${actionIndex}:action`}
        content={"post_redirect"}
      />
    </>
  );
}

/** Renders a 'fc:frame:button', must be used inside a <FrameContainer> */
export function FrameButton(props: FrameButtonProvidedProps) {
  return null;
}

/** An internal component that handles FrameButtons that have type: 'post' */
function FFrameButtonShim({
  actionIndex,
  children,
  onClick,
}: FrameButtonPostProvidedProps & FrameButtonAutomatedProps) {
  return (
    <>
      {process.env.SHOW_UI ? (
        <FrameButtonUI actionIndex={actionIndex}>{children}</FrameButtonUI>
      ) : null}
      <meta
        name={`fc:frame:button:${actionIndex}`}
        content={String(children)}
      />
      <meta name={`fc:frame:button:${actionIndex}:action`} content={"post"} />
    </>
  );
}

/** Render a 'fc:frame:input:text', must be used inside a <FrameContainer> */
export function FrameInput({ text }: { text: string }) {
  return (
    <>
      {process.env.SHOW_UI ? <input type="text" placeholder={text} /> : null}
      <meta name="fc:frame:input:text" content={text} />
    </>
  );
}

/** Render a 'fc:frame:image', must be used inside a <FrameContainer> */
export function FrameImage({ src }: { src: string }) {
  return (
    <>
      {process.env.SHOW_UI ? <img src={src} /> : null}
      <meta name="fc:frame:image" content={src} />
      <meta property="og:image" content={src} />
    </>
  );
}
