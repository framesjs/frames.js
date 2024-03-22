import type { FramesContextFromMiddlewares, FramesMiddleware } from "../types";

/**
 * Runs provided middlewares concurrently. Each middleware should be isolated and not depend on some context value that could be provided by some other middleware that can potentially run in parallel.
 *
 * Also next function passed to each middleware does nothing except modifying the context.
 */
export function concurrentMiddleware<
  TFramesMiddleware extends FramesMiddleware<any, any>[],
>(
  ...middlewares: TFramesMiddleware
): FramesMiddleware<any, FramesContextFromMiddlewares<TFramesMiddleware>> {
  if (middlewares.length === 0) {
    throw new Error("No middlewares provided");
  }

  if (middlewares.length === 1) {
    return middlewares[0]!;
  }

  return async (context, next) => {
    let ctx = context;
    const newContexts: any[] = [];

    await Promise.all(
      middlewares.map((middleware) =>
        // @ts-expect-error this is not 100% correct because next should return a valid result, but since parallel middleware cannot call next middleware in chain, it's fine
        middleware(context, (newCtx) => {
          if (newCtx) {
            newContexts.push(newCtx);
          }
        })
      )
    );

    let finalCtx = ctx;

    for (const newCtx of newContexts) {
      finalCtx = { ...finalCtx, ...newCtx };
    }

    // @ts-expect-error this is correct but type is hard to infer
    return next(finalCtx);
  };
}
