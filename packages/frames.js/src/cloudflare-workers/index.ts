import { Buffer } from "node:buffer";
import type { ExportedHandlerFetchHandler } from "@cloudflare/workers-types";
import type { types } from "../core";
import { createFrames as coreCreateFrames } from "../core";
import type {
  FramesMiddleware,
  FramesRequestHandlerFunction,
  JsonValue,
} from "../core/types";
import type { CoreMiddleware } from "../middleware";
import {
  type CloudflareWorkersMiddleware,
  cloudflareWorkersMiddleware,
} from "./middleware";

export { Button, type types } from "../core";

export { cloudflareWorkersMiddleware } from "./middleware";

// make Buffer available on globalThis so it is compatible with cloudflare workers
globalThis.Buffer = Buffer;

type DefaultMiddleware<TEnv> = [
  ...CoreMiddleware,
  CloudflareWorkersMiddleware<TEnv>,
];

/**
 * Creates Frames instance to use with you Hono server
 *
 * @example
 * ```ts
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
 * ```
 *
 * @example
 * ```ts
 * // With custom type for Env and state
 * import { createFrames, Button, type types } from 'frames.js/cloudflare-workers';
 *
 * type Env = {
 *   secret: string;
 * };
 *
 * type State = { test: boolean };
 *
 * const frames = createFrames<State, Env>();
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
 * ```
 */
export function createFrames<
  TState extends JsonValue | undefined = JsonValue | undefined,
  TEnv = unknown,
  TFramesMiddleware extends
    | FramesMiddleware<any, any>[]
    | undefined = undefined,
>(
  options?: types.FramesOptions<TState, TFramesMiddleware>
): FramesRequestHandlerFunction<
  TState,
  DefaultMiddleware<TEnv>,
  TFramesMiddleware,
  ExportedHandlerFetchHandler<TEnv>
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
      ) as unknown as ReturnType<ExportedHandlerFetchHandler>;
    };
  };
}
