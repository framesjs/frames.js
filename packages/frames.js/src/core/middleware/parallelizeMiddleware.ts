import type { FramesContextFromMiddlewares, FramesMiddleware } from "../types";

/**
 * Parallelizes provided middlewares. Each middleware should be isolated and not depend on some context value that could be provided by some other middleware that can potentially run in parallel.
 *
 * Also next function passed to each middleware does nothing except modifying the context.
 */
export function parallelizeMiddleware<
  TFramesMiddleware extends FramesMiddleware<any>[],
>(
  ...middlewares: TFramesMiddleware
): FramesMiddleware<FramesContextFromMiddlewares<TFramesMiddleware>> {
  if (middlewares.length === 0) {
    throw new Error("No middlewares provided");
  }

  if (middlewares.length === 1) {
    return middlewares[0]!;
  }

  return async (context, next) => {
    let ctx = context;

    await Promise.all(
      middlewares.map((middleware) =>
        // @ts-expect-error this is not 100% correct because next should return a valid result, but since parallel middleware cannot call next middleware in chain, it's fine
        middleware(context, (newCtx) => {
          ctx = { ...ctx, ...newCtx };
        })
      )
    );

    // @ts-expect-error this is correct but type is hard to infer
    return next(ctx);
  };
}
