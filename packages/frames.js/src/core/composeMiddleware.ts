type AnyMiddlewareFunction<TContext, TReturnType> = (
  ctx: TContext,
  next: (newCtx?: TContext | Partial<TContext>) => TReturnType
) => TReturnType;

type ComposedMiddlewareFunction<TContext, TReturnType> = (
  ctx: TContext
) => TReturnType;

export function composeMiddleware<TContext, TReturnType>(
  middleware: AnyMiddlewareFunction<TContext, TReturnType>[]
): ComposedMiddlewareFunction<TContext, TReturnType> {
  if (middleware.length === 0) {
    throw new Error("Please provide at least one middleware function");
  }

  const composedMiddleware = middleware.reduceRight(
    (nextMiddlewareInChain, currentMiddleware) => {
      return (ctx) => {
        return currentMiddleware(ctx, function next(newCtx) {
          return nextMiddlewareInChain({ ...ctx, ...newCtx }, next);
        });
      };
    }
  );

  return (ctx) => {
    return composedMiddleware(ctx, (() => {
      return undefined;
    }) as () => TReturnType);
  };
}
