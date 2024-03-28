import type {
  ExecutionContext,
  IncomingRequestCfProperties,
  Request,
} from "@cloudflare/workers-types";
import type { FramesMiddleware } from "../core/types";

type CloudflareWorkersMiddlewareContext<TEnv> = {
  /**
   * Provided by cloudflareWorkersMiddleware()
   *
   * You can use this object to access the worker ctx and env.
   */
  cf: {
    ctx: ExecutionContext;
    env: TEnv;
    req: Request<unknown, IncomingRequestCfProperties>;
  };
};

type CloudflareWorkersMiddlewareOptions<TEnv> = {
  /**
   * Cloudflare ExecutionContext
   */
  ctx: ExecutionContext;
  /**
   * Env passed to the Cloudflare Worker
   */
  env: TEnv;
  /**
   * Cloudflare Worker request, this is holds the same value as ctx.request but the type is different.
   */
  req: Request<unknown, IncomingRequestCfProperties>;
};

export type CloudflareWorkersMiddleware<TEnv> = FramesMiddleware<
  any,
  CloudflareWorkersMiddlewareContext<TEnv>
>;

/**
 * Middleware that adds Cloudflare Workers context and env to Frames request handler.
 *
 * This middleware is used automatically by createFrames() imported from 'frames.js/cloudflare-workers'.
 */
export function cloudflareWorkersMiddleware<TEnv>(
  options: CloudflareWorkersMiddlewareOptions<TEnv>
): CloudflareWorkersMiddleware<TEnv> {
  return function cloudflareWorkersMiddlewareHandler(ctx, next) {
    return next({
      cf: {
        ctx: options.ctx,
        env: options.env,
        req: options.req,
      },
    });
  };
}
