export { Button, type types } from "../core";
import { createFrames as coreCreateFrames, types } from "../core";
import type { CoreMiddleware } from "../middleware";
import { Buffer } from "node:buffer";
import {
  type CloudflareWorkersMiddleware,
  cloudflareWorkersMiddleware,
} from "./middleware";
import type { ExportedHandlerFetchHandler } from "@cloudflare/workers-types";
import type {
  FramesMiddleware,
  FramesRequestHandlerFunction,
  JsonValue,
} from "../core/types";

export { cloudflareWorkersMiddleware } from "./middleware";

// make Buffer available on globalThis so it is compatible with cloudflare workers
// eslint-disable-next-line no-undef
globalThis.Buffer = Buffer;

type DefaultMiddleware<TEnv> = [
  ...CoreMiddleware,
  CloudflareWorkersMiddleware<TEnv>,
];

/**
 * Creates Frames instance to use with you Hono server
 *
 * @example
 * import { createFrames, Button } from 'frames.js/cloudflare-workers';
 *
 * const frames = createFrames();
 * const fetch = frames(async (ctx) => {
 *  return {
 *   image: <span>Test</span>,
 *    buttons: [
 *    <Button action="post">
 *      Click me
 *    </Button>,
 *    ],
 *  };
 * });
 *
 * @example
 * // With custom type for Env
 * import { createFrames, Button } from 'frames.js/cloudflare-workers';
 *
 * type Env = {
 * secret: string;
 * };
 *
 * const frames = createFrames<Env>();
 * const fetch = frames(async (ctx) => {
 *  return {
 *    image: <span>{ctx.cf.env.secret}</span>,
 *    buttons: [
 *      <Button action="post">
 *        Click me
 *      </Button>,
 *    ],
 *  };
 * });
 *
 * export default {
 *  fetch,
 * } satisfies ExportedHandler;
 */
export function createFrames<
  TEnv = unknown,
  TFramesMiddleware extends
    | FramesMiddleware<any, any>[]
    | undefined = undefined,
  TState extends JsonValue = JsonValue,
>(
  options?: types.FramesOptions<TState, TFramesMiddleware>
): FramesRequestHandlerFunction<
  TState,
  DefaultMiddleware<TEnv>,
  TFramesMiddleware,
  ExportedHandlerFetchHandler<TEnv, unknown>
> {
  return function cloudflareWorkersFramesHandler<
    TPerRouteMiddleware extends
      | types.FramesMiddleware<any, any>[]
      | undefined = undefined,
  >(
    handler: types.FrameHandlerFunction<any, any>,
    handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
  ) {
    return function handleCloudflareWorkersRequest(req, env, ctx) {
      const frames = coreCreateFrames({
        ...options,
        middleware: [
          cloudflareWorkersMiddleware<TEnv>({
            ctx,
            env,
            req,
          }),
          ...(options?.middleware || []),
        ],
      });
      const framesHandler = frames(handler, handlerOptions);

      return framesHandler(
        // @ts-expect-error - req is almost compatible, there are some differences in the types but it mostly fits all the needs
        req
      ) as unknown as ReturnType<ExportedHandlerFetchHandler<unknown>>;
    };
  };
}
