import {
  FrameImage,
  PreviousFrame,
  getPreviousFrame,
} from "frames.js/next/server";
import { headers } from "next/headers";
import { cloneElement, Children } from "react";
import type { JsonValue } from "type-fest";

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

type FrameRouterChildrenComponentTypes<TAppState> =
  | React.ComponentType<FrameRouteProps<TAppState>>
  | React.ComponentType<FrameNotFoundRouteProps>;

type FrameRouterProps<TAppState> = {
  children:
    | Array<
        React.ReactComponentElement<
          FrameRouterChildrenComponentTypes<TAppState>
        >
      >
    | React.ReactComponentElement<typeof FrameNotFoundRoute>;
  searchParams: undefined | { [key: string]: string | string[] | undefined };
  initialState: TAppState;
  /**
   * This function is used to convert app state to a state that is serializable to JSON using JSON.stringify.
   *
   * By default is just passes through the state to JSON.stringify
   */
  toJSONValue?(state: TAppState): JsonValue;
  /**
   * This function is used to convert a JSON value to the app state using JSON.parse.
   *
   * By default is just passes through the value to JSON.parse
   */
  fromJSONValue?(value: JsonValue): TAppState;
  /**
   * Frame POST request handler, can be relative or absolute URL
   */
  framesHandlerURL?: string | URL;
  /**
   * Frame URL, can be relative or absolute URL
   */
  framesURL: string | URL;
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

/**
 * FrameRouter
 *
 * - responsible for determining the previous frame state and rendering the correct frame given for the current path
 */
export async function FrameRouter<TAppState>({
  children,
  searchParams,
  fromJSONValue,
  toJSONValue,
  initialState,
  framesHandlerURL,
  framesURL,
}: FrameRouterProps<TAppState>) {
  console.log(searchParams);
  const previousFrame = getPreviousFrame(searchParams);
  let decodedState: TAppState = initialState;
  let path: string = "/";
  const proto = headers().get("x-forwarded-proto");
  const host = headers().get("host");
  const url = new URL("/", `${proto}://${host}`);

  if (searchParams && typeof searchParams._s === "string") {
    // @todo should we also check signature? hmac so we can trust the state little bit more?
    try {
      const state = JSON.parse(searchParams._s);

      if (!state || typeof state !== "object") {
        throw new Error("Invalid state");
      }

      if (!("p" in state) || typeof state.p !== "string") {
        throw new Error("Invalid state");
      }

      if (!("s" in state)) {
        throw new Error("Invalid state");
      }

      path = state.p;
      decodedState = fromJSONValue ? fromJSONValue(state.s) : state.s;
    } catch (e) {
      console.error("Failed to parse searchParams.s", e);
    }
  }

  const handlerURL = resolveUrl(url, framesHandlerURL);

  const pathToRoute: Record<
    string,
    React.ReactComponentElement<React.ComponentType<FrameRouteProps<TAppState>>>
  > = {};
  let notFoundRoute: React.ReactElement | null = null;

  const $routerState: FrameRouterState<TAppState> = {
    path,
    state: decodedState,
    constructLinkTarget(path, nextState) {
      const url = new URL(handlerURL);

      url.searchParams.set("p", framesURL.toString());
      url.searchParams.set(
        "_s",
        JSON.stringify({
          p: path,
          s: toJSONValue ? toJSONValue(nextState) : nextState,
        })
      );

      return url.toString();
    },
    frame: previousFrame,
  };

  Children.forEach(children, (child) => {
    if (!child) {
      return;
    }

    switch (child.type) {
      case FrameRoute: {
        const props = child.props as unknown as FrameRouteProps<TAppState>;

        if ("index" in props) {
          if (pathToRoute["/"]) {
            throw new Error("Cannot specify more than one index route");
          }

          pathToRoute["/"] = cloneElement(child, { $routerState });
        } else {
          if (pathToRoute[props.path]) {
            throw new Error(
              `Cannot specify more than one route for the same path: "${props.path}"`
            );
          }

          pathToRoute[props.path] = cloneElement(child, { $routerState });
        }

        return;
      }
      case FrameNotFoundRoute: {
        if (notFoundRoute) {
          throw new Error("Cannot specify more than one not found route");
        }

        notFoundRoute = child;

        return;
      }
      default:
        throw new Error("Invalid child");
    }
  });

  const currentRoute = pathToRoute[path] || notFoundRoute || (
    <DefaultNotFoundFrame />
  );

  return (
    <>
      <meta name="fc:frame" content="vNext" />
      {currentRoute}
    </>
  );
}

export type FrameRouteComponentProps<TAppState> = {
  $routerState: FrameRouterState<TAppState>;
};

type FrameRouteProps<TAppState> = {
  /**
   * This is internal value passed by FrameRouter.
   *
   * Normally we would use context for this, but server components don't support context.
   */
  $routerState?: FrameRouterState<TAppState>;
} & (
  | {
      path: string;
      component: React.ComponentType<FrameRouteComponentProps<TAppState>>;
    }
  | {
      index: true;
      component: React.ComponentType<FrameRouteComponentProps<TAppState>>;
    }
);

export function FrameRoute<TAppState>({
  component: C,
  $routerState,
}: FrameRouteProps<TAppState>) {
  if (!$routerState) {
    throw new Error("FrameRoute must be used inside FrameRouter");
  }

  return <C $routerState={$routerState}></C>;
}

type FrameNotFoundRouteProps = {
  children: React.ReactNode;
};

export function FrameNotFoundRoute({ children }: FrameNotFoundRouteProps) {
  return children;
}

type FrameLinkProps<TAppState> = {
  children: string;
  to:
    | string
    | {
        path: string;
        /**
         * If provided, this will be next frame state
         */
        state?: TAppState;
      };
  /**
   * Passed internally by Frame
   */
  $routerState?: FrameRouterState<TAppState>;
  /**
   * Passed internally by Frame
   */
  $frameContext?: FrameContext;
};

export function FrameLink<TAppState>({
  children,
  to,
  $frameContext,
  $routerState,
}: FrameLinkProps<TAppState>) {
  if (!$routerState || !$frameContext) {
    throw new Error("FrameLink must be used inside <Frame />");
  }

  const path = typeof to === "string" ? to : to.path;
  const nextState =
    to && typeof to === "object"
      ? to.state ?? $routerState.state
      : $routerState.state;
  const index = $frameContext.registerButton();

  return (
    <>
      <meta name={`fc:frame:button:${index}`} content={children} />
      <meta name={`fc:frame:button:${index}:action`} content="post" />
      <meta
        name={`fc:frame:button:${index}:target`}
        content={$routerState.constructLinkTarget(path, nextState)}
      />
    </>
  );
}

export function DefaultNotFoundFrame() {
  return (
    <>
      <FrameImage>
        <div>Not found</div>
      </FrameImage>
    </>
  );
}

type FrameContext = {
  registerButton(): number;
};

type AllowedFrameChildren = typeof FrameImage | typeof FrameLink;

type FrameProps<TAppState> = {
  children:
    | React.ReactElement<AllowedFrameChildren>
    | (React.ReactElement<AllowedFrameChildren> | null)[]
    | null;
  $routerState?: FrameRouterState<TAppState>;
};

export function Frame<TAppState>({
  children,
  $routerState,
}: FrameProps<TAppState>) {
  let buttons = 0;

  if (!$routerState) {
    throw new Error("Frame must be used inside FrameRouter");
  }

  const $frameContext: FrameContext = {
    registerButton() {
      buttons++;

      if (buttons > 4) {
        throw new Error("Frames cannot have more than 4 buttons");
      }

      return buttons;
    },
  };

  return (
    <>
      {Children.map(children, (child) => {
        if (!child) {
          return child;
        }

        switch (child.type) {
          case FrameLink: {
            return cloneElement(child, { $routerState, $frameContext });
          }
          default:
            return child;
        }
      })}
    </>
  );
}
