import type {
  FrameHandlerFunction,
  FramesContext,
  FramesContextFromMiddlewares,
  FramesMiddleware,
  FramesMiddlewareReturnType,
  JsonValue,
} from "./types";
import { composeMiddleware } from "./composeMiddleware";
import { renderResponse } from "./middleware/renderResponse";
import { clickedButtonParser } from "./middleware/clickedButtonParser";

const defaultMiddleware = [renderResponse(), clickedButtonParser()] as const;

type FramesOptions<
  TFrameMiddleware extends FramesMiddleware<any>[] | undefined,
> = {
  /**
   * All frame relative targets will be resolved relative to this
   * @default '/''
   */
  basePath?: string;
  initialState?: JsonValue;
  middleware?: TFrameMiddleware extends undefined
    ? FramesMiddleware<any>[]
    : TFrameMiddleware;
};

type FramesRequestHandlerFunctionOptions<
  TPerRouteFrameMiddlewares extends FramesMiddleware<any>[] | undefined,
> = {
  middleware?: TPerRouteFrameMiddlewares;
};

type FramesRequestHandlerFunction<
  TFrameMiddlewares extends FramesMiddleware<any>[] | undefined,
> = <
  TPerRouteMiddleware extends FramesMiddleware<any>[] | undefined = undefined,
>(
  handler: FrameHandlerFunction<
    FramesContextFromMiddlewares<typeof defaultMiddleware> &
      (TFrameMiddlewares extends undefined
        ? {}
        : FramesContextFromMiddlewares<NonNullable<TFrameMiddlewares>>) &
      (TPerRouteMiddleware extends undefined
        ? {}
        : FramesContextFromMiddlewares<NonNullable<TPerRouteMiddleware>>)
  >,
  options?: FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
) => (req: Request) => Promise<Response>;

export function createFrames<
  TMiddlewares extends FramesMiddleware<any>[] | undefined = undefined,
>({
  basePath = "/",
  initialState,
  middleware,
}: FramesOptions<TMiddlewares> = {}): FramesRequestHandlerFunction<TMiddlewares> {
  const globalMiddleware: FramesMiddleware<FramesContext>[] = middleware || [];

  /**
   * This function takes handler function that does the logic with the help of context and returns one of possible results
   */
  return function createFramesRequestHandler(handler, options = {}) {
    const perRouteMiddleware: FramesMiddleware<FramesContext>[] =
      options && Array.isArray(options.middleware) ? options.middleware : [];

    const composedMiddleware = composeMiddleware<
      FramesContext,
      FramesMiddlewareReturnType
    >([
      ...defaultMiddleware,
      ...globalMiddleware,
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
      const context: FramesContext = {
        basePath,
        initialState,
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
