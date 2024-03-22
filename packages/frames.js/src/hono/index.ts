export { Button, type types } from "../core";
import { createFrames as coreCreateFrames, types } from "../core";
import type { Handler } from "hono";
import { CoreMiddleware } from "../middleware";

type CreateFramesForHono = types.CreateFramesFunctionDefinition<
  CoreMiddleware,
  Handler
>;

/**
 * Creates Frames instance to use with you Hono server
 *
 * @example
 * import { createFrames, Button } from 'frames.js/hono';
 * import { Honoe } from 'hono';
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
 */
// @ts-expect-error
export const createFrames: CreateFramesForHono = function createFramesForHono(
  options?: types.FramesOptions<any, any>
) {
  const frames = coreCreateFrames(options);

  return function honoFramesHandler<
    TPerRouteMiddleware extends types.FramesMiddleware<any, any>[],
  >(
    handler: types.FrameHandlerFunction<any, any>,
    handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
  ) {
    const framesHandler = frames(handler, handlerOptions);

    return async function handleHonoRequest(c) {
      return framesHandler(c.req.raw);
    } satisfies Handler;
  };
};
