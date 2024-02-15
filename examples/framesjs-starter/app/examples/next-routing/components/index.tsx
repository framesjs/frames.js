import {
  FrameImage,
  NextServerPageProps,
  PreviousFrame,
  getPreviousFrame,
} from "frames.js/next/server";
import { headers } from "next/headers";
import { cloneElement, Children } from "react";

export type FrameRouterState<TAppState> = {
  /**
   * URL.pathname value, this is used for routing
   */
  path: string;
  /**
   * Userland frame state, this is serialized to JSON
   */
  state: TAppState;
  frame: PreviousFrame;
  constructLinkTarget(path: string, nextState: TAppState): string;
};

function resolveUrl(url: URL, pathOrUrl: string | URL | undefined): URL {
  if (!pathOrUrl) {
    return url;
  }

  if (typeof pathOrUrl === "string") {
    return new URL(pathOrUrl, url);
  }

  return pathOrUrl;
}

type CurrentFrame<TAppState> = {
  state: TAppState;
  previousFrame: PreviousFrame | undefined;
};

export function currentFrame<TAppState>({
  initialState,
  searchParams,
}: {
  initialState: TAppState;
  searchParams: { [key: string]: string | string[] | undefined } | undefined;
}): CurrentFrame<TAppState> {
  const previousFrame = getPreviousFrame(searchParams);
  let decodedState: TAppState = initialState;

  if (searchParams && typeof searchParams._s === "string") {
    // @todo should we also check signature? hmac so we can trust the state little bit more?
    try {
      const state = JSON.parse(searchParams._s);

      if (!state || typeof state !== "object") {
        throw new Error("Invalid state");
      }

      if (!("s" in state)) {
        throw new Error("Invalid state");
      }

      // @todo implement fromJSONValue so users can have complex values in state that can't be directly serialized to JSON
      decodedState = state.s;
    } catch (e) {
      console.error("Failed to parse searchParams.s", e);
    }
  }

  return {
    state: decodedState,
    previousFrame,
  };
}

type FrameLinkProps<TAppState> = {
  children: string;
  to: string | ((state: TAppState) => { path: string; state: TAppState });
  /**
   * Passed internally by Frame
   */
  $routerState?: FrameRouterState<TAppState>;
  /**
   * Passed internally by Frame
   */
  $frameContext?: FrameContext<TAppState>;
};

export function FrameLink<TAppState>({
  children,
  to,
  $frameContext,
}: FrameLinkProps<TAppState>) {
  if (!$frameContext) {
    throw new Error("FrameLink must be used inside <Frame />");
  }

  const index = $frameContext.registerButton();

  return (
    <>
      <meta name={`fc:frame:button:${index}`} content={children} />
      <meta name={`fc:frame:button:${index}:action`} content="post" />
      <meta
        name={`fc:frame:button:${index}:target`}
        content={$frameContext.generateLinkTarget(to)}
      />
    </>
  );
}

type FrameContext<TAppState> = {
  registerButton(): number;
  generateLinkTarget(
    pathOrPathFn:
      | string
      | ((state: TAppState) => { path: string; state: TAppState })
  ): string;
};

type AllowedFrameChildren = typeof FrameImage | typeof FrameLink;

type FrameProps<TAppState> = {
  children:
    | React.ReactElement<AllowedFrameChildren>
    | (React.ReactElement<AllowedFrameChildren> | null)[]
    | null;
  frame: CurrentFrame<TAppState>;
  /**
   * Overrides handler URL. It can be either relative or absolute URL.
   */
  framesHandlerURL?: string | URL;
  /**
   * Overrides where frames handler should redirect us after it processes POST request
   */
  framesURL?: string | URL;
};

export function Frame<TAppState>({
  children,
  frame,
  framesHandlerURL,
  framesURL,
}: FrameProps<TAppState>) {
  const headersList = headers();
  const baseUrl = new URL(
    "/",
    `${headersList.get("x-forwarded-proto")}://${headersList.get("host")}`
  );

  let buttons = 0;

  const $frameContext: FrameContext<TAppState> = {
    registerButton() {
      buttons++;

      if (buttons > 4) {
        throw new Error("Frames cannot have more than 4 buttons");
      }

      return buttons;
    },
    generateLinkTarget(pathOrPathFn) {
      let path: string;
      let nextState = frame.state;

      if (typeof pathOrPathFn === "function") {
        const result = pathOrPathFn(frame.state);

        path = result.path;
        nextState = result.state;
      } else {
        path = pathOrPathFn;
      }

      const pageURL = resolveUrl(baseUrl, framesURL);

      // if page URL is not the root, then append it to the handler URL
      if (pageURL.pathname !== "/") {
        pageURL.pathname = pageURL.pathname + path;
      } else {
        // override path as we don't have a "prefix"
        pageURL.pathname = path;
      }

      // @todo implement toJSONValue so user's can have complex values in state that can't be directly serialized to JSON
      pageURL.searchParams.set("_s", JSON.stringify({ s: nextState }));

      const handlerURL = resolveUrl(baseUrl, framesHandlerURL);

      // this will tell the POST handler to redirect us to this route
      handlerURL.searchParams.set("p", pageURL.toString());

      return handlerURL.toString();
    },
  };

  return (
    <>
      <meta name="fc:frame" content="vNext" />
      {Children.map(children, (child) => {
        if (!child) {
          return child;
        }

        switch (child.type) {
          case FrameLink: {
            return cloneElement(child, { $frameContext });
          }
          default:
            return child;
        }
      })}
    </>
  );
}

export function createFrameComponent<TAppState>({
  framesHandlerURL,
  // @todo this leaks just because of debugger being an app that runs on the same port and domains as frames
  // normally we should have standalone debugger that doesn't interfere with how frames are implemented
  framesURL,
}: {
  framesHandlerURL?: string;
  framesURL?: string;
}) {
  return function FrameWithDefaults(
    props: Omit<FrameProps<TAppState>, "framesHandlerURL" | "framesURL">
  ) {
    return (
      <Frame<TAppState>
        {...props}
        framesHandlerURL={framesHandlerURL}
        framesURL={framesURL}
      />
    );
  };
}

function createFrameComponentWithFrame<TAppState>({
  framesHandlerURL,
  // @todo this leaks just because of debugger being an app that runs on the same port and domains as frames
  // normally we should have standalone debugger that doesn't interfere with how frames are implemented
  framesURL,
  frame,
}: {
  framesHandlerURL?: string;
  framesURL?: string;
  frame: CurrentFrame<TAppState>;
}) {
  return function FrameWithDefaults(
    props: Omit<
      FrameProps<TAppState>,
      "framesHandlerURL" | "framesURL" | "frame"
    >
  ) {
    return (
      <Frame<TAppState>
        {...props}
        frame={frame}
        framesHandlerURL={framesHandlerURL}
        framesURL={framesURL}
      />
    );
  };
}

export type FramePageProps<TAppState> = NextServerPageProps & {
  frame: CurrentFrame<TAppState>;
  Frame: React.ComponentType<
    Omit<FrameProps<TAppState>, "framesHandlerURL" | "framesURL" | "frame">
  >;
};

export function createFramePage<TAppState>(
  {
    initialState,
    framesHandlerURL,
    framesURL,
  }: {
    initialState: TAppState;
    // @todo this leaks just because of debugger being an app that runs on the same port and domains as frames
    // normally we should have standalone debugger that doesn't interfere with how frames are implemented
    framesHandlerURL?: string;
    framesURL?: string;
  },
  Page: React.ComponentType<FramePageProps<TAppState>>
) {
  return function FramePage(props: NextServerPageProps) {
    const frame = currentFrame({
      initialState,
      searchParams: props.searchParams,
    });

    return (
      <Page
        {...props}
        frame={frame}
        Frame={createFrameComponentWithFrame({
          framesHandlerURL,
          framesURL,
          frame,
        })}
      />
    );
  };
}
