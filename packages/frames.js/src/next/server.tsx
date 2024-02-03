import React, { useReducer } from "react";
import { ActionIndex, FrameActionPayload } from "../types";
import { NextRequest, NextResponse } from "next/server";
import { validateFrameMessage } from "..";
import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { FrameButtonRedirectUI, FrameButtonUI } from "frames.js/next/client";
import {
  FrameButtonAutomatedProps,
  FrameButtonPostProvidedProps,
  FrameButtonPostRedirectProvidedProps,
  FrameButtonProvidedProps,
  FrameContext,
  FrameReducer,
  FrameState,
  Dispatch,
  RedirectMap,
  HeadersList,
} from "./types";
export * from "./types";

export type FrameElementType =
  | typeof FrameButton
  | typeof FrameImage
  | typeof FrameInput;

export async function validateFrameMessageOrThrow(
  frameActionPayload: FrameActionPayload | null
) {
  if (!frameActionPayload) {
    // no payload means no action
    return;
  }
  const { isValid } = await validateFrameMessage(frameActionPayload);
  if (!isValid) {
    throw new Error("frames.js: signature failed verification");
  }
}

export function createFrameContextNextjs<T extends FrameState = FrameState>(
  searchParams: Record<string, string>
): FrameContext<T> {
  const headersObj = headers();
  // not sure about the security of doing this for server only headers.
  // const headersList = Object.fromEntries(headers().entries());
  const headersList = {
    userAgent: headersObj.get("user-agent"),
    acceptLanguage: headersObj.get("accept-language"),
    host: headersObj.get("host"),
    pathname: headersObj.get("next-url") ?? "",
    url:
      headersObj.get("referer") ||
      `${headersObj.get("x-forwarded-proto")}://${headersObj.get("x-forwarded-host")}${headersObj.get("next-url") ?? ""}`,
  };

  return createFrameContext(parseFrameParams<T>(searchParams), headersList);
}

export function createFrameContext<T extends FrameState = FrameState>(
  frameContextFromParams: Pick<
    FrameContext<T>,
    "postBody" | "prevState" | "pathname" | "prevRedirects"
  >,
  headers: HeadersList
): FrameContext<T> {
  return {
    ...frameContextFromParams,
    headers: headers,
  };
}

export function parseFrameParams<T extends FrameState = FrameState>(
  searchParams: Record<string, string>
): Pick<
  FrameContext<T>,
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

export function useFramesReducer<T extends FrameState = FrameState>(
  reducer: FrameReducer<T>,
  initialState: T,
  initializerArg: FrameContext<T>
): [T, Dispatch] {
  function frameReducerInit(initial: FrameContext<T>): T {
    if (initial.prevState === null || initial.postBody === null)
      return initialState;

    if (
      initial.prevRedirects?.hasOwnProperty(
        `${initial.postBody.untrustedData.buttonIndex}`
      ) &&
      initial.prevRedirects[`${initial.postBody.untrustedData.buttonIndex}`]
    ) {
      // FIXME: this is a 307 not a 302
      redirect(
        initial.prevRedirects[`${initial.postBody.untrustedData.buttonIndex}`]!,
        RedirectType.replace
      );
    }
    return reducer(initial.prevState, initial);
  }

  // doesn't do anything right now, but exists to make Button onClicks feel more natural and not magic.
  function dispatch(actionIndex: ActionIndex) {}

  return [frameReducerInit(initializerArg), dispatch];
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const url = new URL(req.url);
  url.pathname = url.searchParams.get("pathname") || "/";

  const bodyAsString = JSON.stringify(body);

  url.searchParams.set("postBody", bodyAsString);
  url.searchParams.set("prevState", url.searchParams.get("prevState") ?? "");
  url.searchParams.set(
    "prevRedirects",
    url.searchParams.get("prevRedirects") ?? ""
  );

  console.info("redirecting to", url.toString());
  // FIXME: does this need to return 200?
  return NextResponse.redirect(url.toString());
}

export function FrameContainer<T extends FrameState = FrameState>({
  children,
  postRoute,
  state,
  frameContext,
}: {
  postRoute: string;
  children: Array<React.ReactElement<FrameElementType>>;
  state: T;
  frameContext: FrameContext<T>;
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

  searchParams.set("pathname", frameContext.headers.pathname ?? "/");
  searchParams.set("prevState", JSON.stringify(state));
  searchParams.set("prevRedirects", JSON.stringify(redirectMap));

  const postUrl = `${postRoute}?${searchParams.toString()}`;

  return (
    <>
      <meta name="fc:frame" content="vNext" />
      <meta name="fc:frame:post_url" content={postUrl} />
      {newTree}
    </>
  );
}

export function FrameRedirect({
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

export function FrameButton(props: FrameButtonProvidedProps) {
  return null;
}

export function FFrameButtonShim({
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

export function FrameInput({ text }: { text: string }) {
  return (
    <>
      {process.env.SHOW_UI ? <input type="text" placeholder={text} /> : null}
      <meta name="fc:frame:input:text" content={text} />
    </>
  );
}

export function FrameImage({ src }: { src: string }) {
  return (
    <>
      {process.env.SHOW_UI ? <img src={src} /> : null}
      <meta name="fc:frame:image" content={src} />
      <meta property="og:image" content={src} />
    </>
  );
}
