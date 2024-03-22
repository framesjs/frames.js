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
  TState extends JsonValue,
  TMiddlewares extends FramesMiddleware<any>[] | undefined = undefined,
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
  const globalMiddleware: FramesMiddleware<FramesContext<TState>>[] =
    middleware || [];

  /**
   * This function takes handler function that does the logic with the help of context and returns one of possible results
   */
  return function createFramesRequestHandler(handler, options = {}) {
    const perRouteMiddleware: FramesMiddleware<FramesContext<TState>>[] =
      options && Array.isArray(options.middleware) ? options.middleware : [];

    const composedMiddleware = composeMiddleware<
      FramesContext<TState>,
      FramesMiddlewareReturnType
    >([
      ...defaultMiddleware,
      ...globalMiddleware,
      stateMiddleware<TState>(),
      ...perRouteMiddleware,
      async function handlerMiddleware(ctx) {
        // @ts-expect-error the value is correct just type is difficult to infer
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
