import { coreMiddleware } from "../middleware/default";
import { stateMiddleware } from "../middleware/stateMiddleware";
import { composeMiddleware } from "./composeMiddleware";
import type {
  FramesContext,
  FramesMiddleware,
  FramesMiddlewareReturnType,
  FramesOptions,
  FramesRequestHandlerFunction,
  JsonValue,
} from "./types";

function inferURLFromRequestOrBaseURL(request: Request, baseURL?: URL): URL {
  if (baseURL) {
    return baseURL;
  }

  return new URL(request.url);
}

function cloneRequestWithInferedURL(request: Request, url: URL): Request {
  if (request.url === url.toString()) {
    return request;
  }

  return new Request(url, request);
}

export function createFrames<
  TState extends JsonValue | undefined = JsonValue | undefined,
  TMiddlewares extends FramesMiddleware<any, any>[] | undefined = undefined,
>({
  basePath = "/",
  initialState,
  middleware,
  baseURL,
}: FramesOptions<TState, TMiddlewares> = {}): FramesRequestHandlerFunction<
  TState,
  typeof coreMiddleware,
  TMiddlewares,
  (req: Request) => Promise<Response> | Response
> {
  const globalMiddleware: FramesMiddleware<TState, FramesContext<TState>>[] =
    middleware || [];
  let url: URL | undefined;

  // validate baseURL
  if (typeof baseURL === "string") {
    try {
      url = new URL(baseURL);
    } catch (e) {
      throw new Error(`Invalid baseURL: ${(e as Error).message}`);
    }
  } else {
    url = baseURL;
  }

  /**
   * This function takes handler function that does the logic with the help of context and returns one of possible results
   */
  return function createFramesRequestHandler(handler, options = {}) {
    const perRouteMiddleware: FramesMiddleware<
      JsonValue | undefined,
      FramesContext<TState>
    >[] = Array.isArray(options.middleware) ? options.middleware : [];

    const composedMiddleware = composeMiddleware<
      FramesContext<TState>,
      FramesMiddlewareReturnType<TState>
    >([
      ...coreMiddleware,
      // @ts-expect-error hard to type internally so skipping for now
      ...globalMiddleware,
      // @ts-expect-error hard to type internally so skipping for now
      stateMiddleware<TState>(),
      // @ts-expect-error hard to type internally so skipping for now
      ...perRouteMiddleware,
      // @ts-expect-error hard to type internally so skipping for now
      async function handlerMiddleware(ctx) {
        // @ts-expect-error hard to type internally so skipping for now
        return handler(ctx);
      },
    ]);

    /**
     * This function just handles Request and returns a Response.
     *
     * In order to support different HTTP frameworks, you just need an adapter that creates a Request and
     * maps Response to frameworks response type.
     */
    return async function handleFramesRequest(request: Request) {
      const inferedURL = inferURLFromRequestOrBaseURL(request, url);
      const context: FramesContext<TState> = {
        basePath,
        initialState: initialState as TState,
        request: cloneRequestWithInferedURL(request, inferedURL),
        url: inferedURL,
      };

      const result = await composedMiddleware(context);

      if (!(result instanceof Response)) {
        throw new Error(
          "Please provide a middleware that returns a Response as first middleware in order."
        );
      }

      return result;
    };
  };
}
