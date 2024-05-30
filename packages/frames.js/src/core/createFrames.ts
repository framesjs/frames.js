import { debugImageMiddleware } from "../middleware/debugImageMiddleware";
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
import { resolveBaseUrl } from "./utils";

export function createFrames<
  TState extends JsonValue | undefined = JsonValue | undefined,
  TMiddlewares extends FramesMiddleware<any, any>[] | undefined = undefined,
>({
  basePath = "/",
  initialState,
  middleware,
  baseUrl,
  stateSigningSecret,
  debug = false,
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
  if (typeof baseUrl === "string") {
    try {
      url = new URL(baseUrl);
    } catch (e) {
      throw new Error(`Invalid baseUrl: ${(e as Error).message}`);
    }
  } else {
    url = baseUrl;
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
      ...globalMiddleware,
      // @ts-expect-error hard to type internally so skipping for now
      stateMiddleware<TState>(),
      // @ts-expect-error hard to type internally so skipping for now
      ...perRouteMiddleware,
      // this middleware allows us to output source jsx of an image, useful in debugger's playground
      // we need this middleware to be called right befor handler so we can intercept the image
      // before it is modified by any middleware
      // @ts-expect-error hard to type internally so skipping for now
      debugImageMiddleware<TState>(),
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
      const context: FramesContext<TState> = {
        basePath,
        initialState: initialState as TState,
        request,
        url: new URL(request.url),
        baseUrl: resolveBaseUrl(request, url, basePath),
        stateSigningSecret,
        debug,
        __debugInfo: {},
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
