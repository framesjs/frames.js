import { coreMiddleware } from "../middleware";
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

export function createFrames<
  TState extends JsonValue | undefined = JsonValue | undefined,
  TMiddlewares extends FramesMiddleware<any, any>[] | undefined = undefined,
>({
  basePath = "/",
  initialState,
  middleware,
}: FramesOptions<TState, TMiddlewares> = {}): FramesRequestHandlerFunction<
  TState,
  typeof coreMiddleware,
  TMiddlewares,
  (req: Request) => Promise<Response>
> {
  const globalMiddleware: FramesMiddleware<TState, FramesContext<TState>>[] =
    middleware || [];

  /**
   * This function takes handler function that does the logic with the help of context and returns one of possible results
   */
  return function createFramesRequestHandler(handler, options = {}) {
    const perRouteMiddleware: FramesMiddleware<any, FramesContext<TState>>[] =
      options && Array.isArray(options.middleware) ? options.middleware : [];

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
      const context: FramesContext<TState> = {
        basePath,
        initialState: initialState as TState,
        request,
        url: new URL(request.url),
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
