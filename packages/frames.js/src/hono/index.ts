import type { Handler } from "hono";
import type { types } from "../core";
import { createFrames as coreCreateFrames } from "../core";
import type { CoreMiddleware } from "../middleware";

export { Button, type types } from "../core";

type CreateFramesForHono = types.CreateFramesFunctionDefinition<
  CoreMiddleware,
  Handler
>;

/**
 * Creates Frames instance to use with you Hono server
 *
 * @example
 * ```tsx
 * import { createFrames, Button } from 'frames.js/hono';
 * import { Hono } from 'hono';
 *
 * const frames = createFrames();
 * const honoHandler = frames(async (ctx) => {
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
 * const app = new Hono();
 *
 * app.on(['GET', 'POST'], '/', honoHandler);
 * ```
 */
// @ts-expect-error -- this code is correct just function doesn't satisfy the type
export const createFrames: CreateFramesForHono = function createFramesForHono(
  options?: types.FramesOptions<types.JsonValue | undefined, undefined>
) {
  const frames = coreCreateFrames(options);

  return function honoFramesHandler<
    TPerRouteMiddleware extends types.FramesMiddleware<
      types.JsonValue | undefined,
      Record<string, unknown>
    >[],
  >(
    handler: types.FrameHandlerFunction<
      types.JsonValue | undefined,
      Record<string, unknown>
    >,
    handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
  ) {
    const framesHandler = frames(handler, handlerOptions);

    return async function handleHonoRequest(c) {
      return framesHandler(c.req.raw);
    } satisfies Handler;
  };
};
