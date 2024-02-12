import { FrameActionMessage } from "../farcaster";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import React from "react";
import {
  FrameMessageReturnType,
  GetFrameMessageOptions,
  getByteLength,
  validateFrameMessage,
  getFrameMessage as _getFrameMessage,
} from "..";
import {
  ActionIndex,
  FrameActionPayload,
  HubHttpUrlOptions,
  ImageAspectRatio,
} from "../types";
import {
  Dispatch,
  FrameButtonAutomatedProps,
  FrameButtonPostProvidedProps,
  FrameButtonPostRedirectProvidedProps,
  FrameButtonProvidedProps,
  FrameReducer,
  FrameState,
  HeadersList,
  NextServerPageProps,
  PreviousFrame,
  RedirectMap,
  RedirectHandler,
  FrameButtonMintProvidedProps,
} from "./types";
export * from "./types";

import { ImageResponse } from "@vercel/og";
import type { SatoriOptions } from "satori";

/** The valid children of a <FrameContainer> */
export type FrameElementType =
  | typeof FrameButton
  | typeof FrameImage
  | typeof FrameInput;

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

/** Convenience wrapper around `framesjs.getFrameMessage` that accepts a null for payload body.
 * Returns a `FrameActionData` object from the message trusted data. (e.g. button index, input text). The `fetchHubContext` option (default: true) determines whether to validate and fetch other metadata from hubs.
 * If `isValid` is false, the message should not be trusted.
 */
export async function getFrameMessage<T extends GetFrameMessageOptions>(
  frameActionPayload: FrameActionPayload | null,
  options?: T
): Promise<FrameMessageReturnType<T> | null> {
  if (options?.hubHttpUrl) {
    if (!options.hubHttpUrl.startsWith("http")) {
      throw new Error(
        `frames.js: Invalid Hub URL: ${options?.hubHttpUrl}, ensure you have included the protocol (e.g. https://)`
      );
    }
  }

  if (!frameActionPayload) {
    console.log(
      "info: no frameActionPayload, this is expected for the homeframe"
    );
    // no payload means no action
    return null;
  }

  const result = await _getFrameMessage(frameActionPayload, options);

  if (!result) {
    throw new Error("frames.js: something went wrong getting frame message");
  }

  return result;
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
  searchParams: NextServerPageProps["searchParams"]
): Pick<
  PreviousFrame<T>,
  "postBody" | "prevState" | "pathname" | "prevRedirects"
> {
  const frameActionReceived =
    searchParams?.postBody && typeof searchParams?.postBody === "string"
      ? (JSON.parse(searchParams?.postBody) as FrameActionPayload)
      : null;

  const framePrevState =
    searchParams?.prevState && typeof searchParams?.prevState === "string"
      ? (JSON.parse(searchParams?.prevState) as T)
      : null;

  const framePrevRedirects =
    searchParams?.prevRedirects &&
    typeof searchParams?.prevRedirects === "string"
      ? (JSON.parse(searchParams?.prevRedirects) as RedirectMap)
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
export async function POST(
  req: NextRequest,
  /** unused, but will most frequently be passed a res: NextResponse object. Should stay in here for easy consumption compatible with next.js */
  res: NextResponse,
  redirectHandler?: RedirectHandler
) {
  const body = await req.json();

  const url = new URL(req.url);
  let newUrl = new URL(req.url);
  const isFullUrl =
    url.searchParams.get("p")?.startsWith("http://") ||
    url.searchParams.get("p")?.startsWith("https://");
  if (isFullUrl) newUrl = new URL(url.searchParams.get("p")!);
  else newUrl.pathname = url.searchParams.get("p") || "";

  // decompress from 256 bytes limitation of post_url
  newUrl.searchParams.set("postBody", JSON.stringify(body));
  newUrl.searchParams.set("prevState", url.searchParams.get("s") ?? "");
  newUrl.searchParams.set("prevRedirects", url.searchParams.get("r") ?? "");
  // was used to redirect to the correct page, and is no longer needed.
  newUrl.searchParams.delete("p");
  newUrl.searchParams.delete("s");
  newUrl.searchParams.delete("r");

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
  return NextResponse.redirect(newUrl.toString(), { status: 302 });
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
  pathname,
  previousFrame,
}: {
  /** Either a relative e.g. "/frames" or an absolute path, e.g. "https://google.com/frames" */
  postUrl: string;
  /** The elements to include in the Frame */
  children: Array<React.ReactElement<FrameElementType> | null>;
  /** The current reducer state object, returned from useFramesReducer */
  state: T;
  previousFrame: PreviousFrame<T>;
  /** The absolute or relative path of the page that this frame is on, relative to root (/), defaults to (/) */
  pathname?: string;
}) {
  if (!pathname)
    console.warn(
      "frames.js: warning: You have not specified a `pathname` prop on your <FrameContainer>. This is not recommended, as it will default to the root path and not work if your frame is being rendered at a different path. Please specify a `pathname` prop on your <FrameContainer>."
    );

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

            // set redirect data for retrieval
            if ((child.props as any).action === "post_redirect") {
              redirectMap[nextIndexByComponentType.button] = (
                child.props as any as FrameButtonPostRedirectProvidedProps
              ).target!;
            }

            return (
              <FFrameButtonShim
                {...(child.props as any)}
                actionIndex={nextIndexByComponentType.button++ as ActionIndex}
              />
            );

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
  searchParams.set("p", pathname ?? previousFrame.headers.pathname ?? "/");
  // short for state
  searchParams.set("s", JSON.stringify(state));
  // short for redirects
  searchParams.set("r", JSON.stringify(redirectMap));

  const postUrlRoute = postUrl.startsWith("/")
    ? `${previousFrame.headers.urlWithoutPathname}${postUrl}`
    : postUrl;

  const postUrlFull = `${postUrlRoute}?${searchParams.toString()}`;
  if (getByteLength(postUrlFull) > 256) {
    console.error(
      `post_url is too long. ${postUrlFull.length} bytes, max is 256. The url is generated to include your state and the redirect urls in <FrameButton href={s. In order to shorten your post_url, you could try storing less in state, or providing redirects via the POST handler's second optional argument instead, which saves url space. The generated post_url was: `,
      postUrlFull
    );
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

/** Renders a 'fc:frame:button', must be used inside a <FrameContainer> */
export function FrameButton(props: FrameButtonProvidedProps) {
  return null;
}

/** An internal component that handles FrameButtons that have type: 'post' */
function FFrameButtonShim({
  actionIndex,
  target,
  action = "post",
  children,
}: FrameButtonPostProvidedProps & FrameButtonAutomatedProps) {
  return (
    <>
      <meta
        name={`fc:frame:button:${actionIndex}`}
        content={String(children)}
      />
      <meta name={`fc:frame:button:${actionIndex}:action`} content={action} />
      {target ? (
        <meta name={`fc:frame:button:${actionIndex}:target`} content={target} />
      ) : null}
    </>
  );
}

/** Render a 'fc:frame:input:text', must be used inside a <FrameContainer> */
export function FrameInput({ text }: { text: string }) {
  return (
    <>
      <meta name="fc:frame:input:text" content={text} />
    </>
  );
}

/** Render a 'fc:frame:image', must be used inside a <FrameContainer> */
export async function FrameImage(
  props: {
    /** 'fc:frame:aspect_ratio' (defaults to 1:91) */
    aspectRatio?: ImageAspectRatio;
  } & (
    | {
        src: string;
      }
    | {
        /** Children to pass to satori to render to PNG. [Supports tailwind](https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images#tailwind-css-support) via the `tw=` prop instead of `className` */
        children: React.ReactNode;
        options?: SatoriOptions;
      }
  )
) {
  let imgSrc: string;

  if ("children" in props) {
    const imageOptions = {
      ...(props.aspectRatio === "1:1"
        ? {
            width: 1146,
            height: 1146,
          }
        : {
            width: 1146,
            height: 600,
          }),
      ...(props.options ?? {}),
    };

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            display: "flex", // Use flex layout
            flexDirection: "row", // Align items horizontally
            alignItems: "stretch", // Stretch items to fill the container height
            width: "100%",
            height: "100vh", // Full viewport height
            backgroundColor: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              lineHeight: 1.2,
              fontSize: 36,
              color: "black",
              flex: 1,
              overflow: "hidden",
            }}
          >
            {props.children}
          </div>
        </div>
      ),
      imageOptions
    );
    const imgBuffer = await imageResponse?.arrayBuffer();
    imgSrc = `data:image/png;base64,${Buffer.from(imgBuffer).toString("base64")}`;
  } else {
    imgSrc = props.src;
  }

  return (
    <>
      <meta name="fc:frame:image" content={imgSrc} />
      <meta property="og:image" content={imgSrc} />
      {props.aspectRatio && (
        <meta
          name="fc:frame:image:aspect_ratio"
          content={props.aspectRatio}
        ></meta>
      )}
    </>
  );
}
