import type {
  FramesContext,
  FramesMiddleware,
  FramesMiddlewareReturnType,
  FramesOptions,
  FramesRequestHandlerFunction,
  JsonValue,
} from "./types";
import { composeMiddleware } from "./composeMiddleware";
import { renderResponse } from "./middleware/renderResponse";
import { framesjsMiddleware } from "./middleware/framesjsMiddleware";
import { parseFramesMessage } from "./middleware/parseFramesMessage";
import { stateMiddleware } from "./middleware/stateMiddleware";

const defaultMiddleware = [
  renderResponse(),
  framesjsMiddleware(),
  parseFramesMessage(),
] as const;

export type DefaultMiddleware = typeof defaultMiddleware;

export function createFrames<
  TState extends JsonValue | undefined,
  TMiddlewares extends FramesMiddleware<any, any>[] | undefined = undefined,
>({
  basePath = "/",
  initialState,
  middleware,
}: FramesOptions<TState, TMiddlewares> = {}): FramesRequestHandlerFunction<
  TState,
  typeof defaultMiddleware,
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
      ...defaultMiddleware,
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
        currentURL: new URL(request.url),
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
