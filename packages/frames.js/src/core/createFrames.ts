import { coreMiddleware } from "../middleware/default";
import { imagesWorkerMiddleware } from "../middleware/images-worker";
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
  imagesRoute,
  imageRenderingOptions,
  imagesSigningSecret,
  stateSigningSecret,
  signingSecret,
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
      // @ts-expect-error hard to type internally so skipping for now
      imagesWorkerMiddleware({
        imagesRoute: imagesRoute === undefined ? "/" : imagesRoute,
        imageRenderingOptions,
        secret: imagesSigningSecret || signingSecret,
      }),
      // @ts-expect-error hard to type internally so skipping for now
      ...globalMiddleware,
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
      const context: FramesContext<TState> = {
        basePath,
        initialState: initialState as TState,
        request,
        url: new URL(request.url),
        baseUrl: resolveBaseUrl(request, url, basePath),
        stateSigningSecret: stateSigningSecret || signingSecret,
        debug,
        __debugInfo: {},
      };

      if (
        imagesRoute === undefined &&
        // Detect non-standard route
        !context.baseUrl.pathname.endsWith("/frames")
      ) {
        // eslint-disable-next-line no-console -- provide feedback
        console.warn(
          `Warning (frames.js): \`imagesRoute\` option is not set in createFrames call, falling back to '${context.baseUrl.toString()}' for image rendering. Set this to the path of your initial frame relative to the \`basePath\` to avoid this warning. See https://framesjs.org/reference/core/createFrames#imagesroute for more information.`
        );
      }

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
