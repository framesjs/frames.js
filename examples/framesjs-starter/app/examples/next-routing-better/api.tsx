import { getByteLength } from "frames.js";
import {
  FrameImage,
  getPreviousFrame,
  type FrameState,
  PreviousFrame,
  type FrameButtonMintProvidedProps,
  type FrameButtonPostRedirectProvidedProps,
  FrameInput,
} from "frames.js/next/server";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { resolve as resolvePath } from "path";
import { Children, cloneElement } from "react";

/**
 * Used by frames() function to remove boilerplate of passing searchParams from Page props.
 */
export const FRAMES_JS_SEARCH_PARAMS_HEADER_KEY = "x-frames-js-search-params";
export const FRAMES_JS_INITIAL_STATE_HEADER_KEY = "x-frames-js-initial-state";
export const FRAMES_JS_MAXIMUM_BUTTON_COUNT = 4;
export const FRAMES_JS_BASE_URL_HEADER_KEY = "x-frames-js-base-url";
export const FRAMES_JS_HANDLER_URL_HEADER_KEY = "x-frames-js-handler-url";
export const FRAMES_JS_STATE_QUERY_PARAM_KEY = "s";
export const FRAMES_JS_PATH_QUERY_PARAM_KEY = "p";
export const FRAMES_JS_REDIRECTS_QUERY_PARAM_KEY = "r";
export const FRAMES_JS_MAXIMUM_POST_URL_LENGTH_IN_BYTES = 256;

function resolveUrl(url: URL, pathOrUrl: string | URL | undefined): URL {
  if (!pathOrUrl) {
    return url;
  }

  if (typeof pathOrUrl === "string") {
    return new URL(pathOrUrl, url);
  }

  return pathOrUrl;
}

function checkButtonTargetValidity(url: string) {
  if (getByteLength(url) > FRAMES_JS_MAXIMUM_POST_URL_LENGTH_IN_BYTES) {
    throw new Error(
      `You can't have a URL longer than ${FRAMES_JS_MAXIMUM_POST_URL_LENGTH_IN_BYTES} bytes as a target`
    );
  }
}

function checkFrameContext() {
  const headerList = headers();

  if (
    !(
      headerList.has(FRAMES_JS_SEARCH_PARAMS_HEADER_KEY) ||
      headerList.has(FRAMES_JS_INITIAL_STATE_HEADER_KEY) ||
      headerList.has(FRAMES_JS_BASE_URL_HEADER_KEY) ||
      headerList.has(FRAMES_JS_HANDLER_URL_HEADER_KEY)
    )
  ) {
    throw new Error(
      "frames() function requires a middleware to be used. Please use createMiddleware() function to create a middleware and use it in your app."
    );
  }
}

/**
 * Creates a middleware that must be used in order to remove boilerplate from our frames pages
 */
export function createMiddleware<TFrameState extends FrameState = FrameState>(
  initialState: TFrameState,
  {
    framesURL: framesBaseURL = "/frames",
    framesHandlerURL = "/",
  }: {
    /**
     * Relative path or absolute URL for POST request handler
     *
     * @default "/frames"
     */
    framesHandlerURL?: string;
    /**
     * Relative path or absolute URL which can be used as "basePath" for FrameLink routes
     * @default "/"
     */
    framesURL?: string;
  } = {}
) {
  return function middleware(request: NextRequest) {
    const response = NextResponse.next();
    const url = new URL(request.url);

    response.headers.set(FRAMES_JS_SEARCH_PARAMS_HEADER_KEY, url.search);
    response.headers.set(
      FRAMES_JS_INITIAL_STATE_HEADER_KEY,
      JSON.stringify(initialState)
    );
    response.headers.set(
      FRAMES_JS_BASE_URL_HEADER_KEY,
      resolveUrl(url, framesBaseURL).toString()
    );
    response.headers.set(
      FRAMES_JS_HANDLER_URL_HEADER_KEY,
      resolveUrl(url, framesHandlerURL).toString()
    );

    return response;
  };
}

type GenerateLinkResult<TFrameState extends FrameState = FrameState> = {
  path: string;
  state: TFrameState;
};

type FramesFunctionResult<TFrameState extends FrameState = FrameState> = {
  state: TFrameState;
  previousFrame: PreviousFrame<TFrameState>;
  generatePostButtonTarget(
    to:
      | string
      | ((currentState: TFrameState) => GenerateLinkResult<TFrameState>)
  ): string;
  generatePostRedirectButtonTarget(buttonIndex: number, to: string): string;
};

// @todo in future version of react we can cache this function so it is computed only once per request. To use it now we would need to use canary version of react.
export function frames<
  TFrameState extends FrameState = FrameState,
>(): FramesFunctionResult<TFrameState> {
  const headerList = headers();

  checkFrameContext();

  // get search params from the headers that were provided by middleware
  const searchParams = new URLSearchParams(
    headerList.get(FRAMES_JS_SEARCH_PARAMS_HEADER_KEY) || ""
  );
  const initialState = JSON.parse(
    headerList.get(FRAMES_JS_INITIAL_STATE_HEADER_KEY)!
  ) as TFrameState;
  const frameURL = headerList.get(FRAMES_JS_BASE_URL_HEADER_KEY)!;
  const frameHandlerURL = headerList.get(FRAMES_JS_HANDLER_URL_HEADER_KEY)!;

  const frame = getPreviousFrame<TFrameState>(
    Object.fromEntries(searchParams.entries())
  );

  return {
    state: frame.prevState ?? initialState,
    previousFrame: frame,
    generatePostButtonTarget(to) {
      let path: string;
      let state: TFrameState = frame.prevState ?? initialState;

      if (typeof to === "string") {
        path = to;
      } else {
        ({ path, state } = to(this.state));
      }

      // resolve path relatively to base frames URL, this path is then used by POST handler to redirect us to the correct page
      const pageURL = new URL(frameURL);
      // convert path to relative path so we can resolve properly
      pageURL.pathname = resolvePath(pageURL.pathname, `.${path}`);

      const handlerURL = new URL(frameHandlerURL);

      // FRAMES_JS_PATH_QUERY_PARAM_KEY query param is used by POST handler to redirect to correct page
      handlerURL.searchParams.set(
        FRAMES_JS_PATH_QUERY_PARAM_KEY,
        pageURL.toString()
      );
      // FRAMES_JS_STATE_QUERY_PARAM_KEY query param is used by POST handler to provide prevState to frames page
      handlerURL.searchParams.set(
        FRAMES_JS_STATE_QUERY_PARAM_KEY,
        JSON.stringify(state)
      );

      const target = handlerURL.toString();

      checkButtonTargetValidity(target);

      return target;
    },
    generatePostRedirectButtonTarget(buttonIndex, to) {
      let url: URL;

      // to must be an absolute URL
      try {
        url = new URL(to);
      } catch (e) {
        console.error(e);
        throw new Error(
          `<FrameButton action="post_redirect" />'s target prop must be an absolute URL (e.g. "https://example.com"), "${to}" has been provided.`
        );
      }

      const handlerURL = new URL(frameHandlerURL);
      handlerURL.searchParams.set(
        FRAMES_JS_REDIRECTS_QUERY_PARAM_KEY,
        // @todo this should be just replaced with single value, but for backward compatibility we keep it as an object
        JSON.stringify({
          [buttonIndex]: url.toString(),
        })
      );

      const target = handlerURL.toString();

      checkButtonTargetValidity(target);

      return target;
    },
  };
}

type AllowedFrameChildren =
  | typeof FrameImage
  | typeof FrameLink
  | typeof FrameButton
  | typeof FrameInput;

type FrameProps = {
  children:
    | React.ReactElement<AllowedFrameChildren>
    | null
    | Array<React.ReactElement<AllowedFrameChildren> | null>;
};

type FrameContext = {
  registerFrameButton: () => number;
  frame: FramesFunctionResult;
};

export function Frame({ children }: FrameProps) {
  const frame = frames();
  let buttons = 0;
  /**
   * This is a special context that is passed to FrameLink internally because react server component don't support context.
   * In future version of reach we would use cache() function instead an cache the context there which will be reused per request
   * and accessible in all components. If we wanted to use it now that would require us to use canary version of React which would force users
   * to install it.
   */
  const $frameContext: FrameContext = {
    registerFrameButton() {
      buttons++;

      if (buttons > FRAMES_JS_MAXIMUM_BUTTON_COUNT) {
        throw new Error(
          `You can only have ${FRAMES_JS_MAXIMUM_BUTTON_COUNT} buttons in a frame`
        );
      }

      return buttons;
    },
    frame,
  };

  return (
    <>
      <meta name="fc:frame" content="vNext" />
      {Children.map(children, (child) => {
        if (!child) {
          return null;
        }

        switch (child.type) {
          case FrameLink:
            return cloneElement(
              child as unknown as React.ReactElement<
                FrameLinkProps,
                typeof FrameLink
              >,
              {
                $frameContext,
              }
            );
          case FrameButton:
            return cloneElement(
              child as unknown as React.ReactElement<
                FrameButtonProps,
                typeof FrameButton
              >,
              {
                $frameContext,
              }
            );
          default:
            return child;
        }
      })}
    </>
  );
}

type FrameLinkProps<TFrameState extends FrameState = FrameState> = {
  children: string | number;
  to:
    | string
    | ((currentState: TFrameState) => { path: string; state: TFrameState });
  /**
   * This prop is passed internally by Frame component.
   */
  $frameContext?: FrameContext;
};

export function FrameLink<TFrameState extends FrameState = FrameState>({
  children,
  to,
  $frameContext,
}: FrameLinkProps<TFrameState>) {
  if (!$frameContext) {
    throw new Error(
      "<FrameLink /> component must be used inside <Frame /> component"
    );
  }

  const buttonIndex = $frameContext.registerFrameButton();
  const frame = frames<TFrameState>();
  const namePrefix = `fc:frame:button:${buttonIndex}`;

  return (
    <>
      <meta name={namePrefix} content={children.toString()} />
      <meta name={`${namePrefix}:action`} content="post" />
      <meta
        name={`${namePrefix}:target`}
        content={frame.generatePostButtonTarget(to)}
      />
    </>
  );
}

type FrameButtonProps = {
  /**
   * This prop is passed internally by Frame component.
   */
  $frameContext?: FrameContext;
} & (
  | {
      action: "link";
      /**
       * Must be absolute URL
       */
      target: string;
      children: string | number;
    }
  | FrameButtonMintProvidedProps
  | FrameButtonPostRedirectProvidedProps
);

export function FrameButton({
  $frameContext,
  children,
  ...rest
}: FrameButtonProps) {
  if (!$frameContext) {
    throw new Error(
      "<FrameButton /> component must be used inside <Frame /> component"
    );
  }

  const buttonIndex = $frameContext.registerFrameButton();
  const namePrefix = `fc:frame:button:${buttonIndex}`;
  let targetMeta: React.ReactElement | null = null;

  if (rest.action === "post_redirect" && rest.target) {
    targetMeta = (
      <meta
        name={`${namePrefix}:target`}
        content={$frameContext.frame.generatePostRedirectButtonTarget(
          buttonIndex,
          rest.target
        )}
      />
    );
  } else if (rest.target) {
    checkButtonTargetValidity(rest.target);
    targetMeta = <meta name={`${namePrefix}:target`} content={rest.target} />;
  }

  return (
    <>
      <meta name={namePrefix} content={children.toString()} />
      <meta name={`${namePrefix}:action`} content={rest.action} />
      {targetMeta}
    </>
  );
}
