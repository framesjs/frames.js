export { Button, type types } from "@frames.js/core";
import {
  DefaultMiddleware,
  createFrames as coreCreateFrames,
  types,
} from "@frames.js/core";
import type { Handler } from "hono";

type CreateFramesForHono = types.CreateFramesFunctionDefinition<
  DefaultMiddleware,
  Handler
>;

/**
 * Creates Frames instance to use with you Hono server
 *
 * @example
 * import { createFrames, Button } from '@frames.js/hono';
 * import { Honoe } from 'hono';
 *
 * const frames = createFrames();
 * const honoHandler = frames(async ({ request }) => {
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
export const createFrames: CreateFramesForHono = function createFramesForHono(
  options?: types.FramesOptions<any>
) {
  const frames = coreCreateFrames(options);

  return function honoFramesHandler<
    TPerRouteMiddleware extends types.FramesMiddleware<any>[],
  >(
    handler: types.FrameHandlerFunction<any>,
    handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
  ) {
    const framesHandler = frames(handler, handlerOptions);

    return async function handleHonoRequest(c) {
      return framesHandler(c.req.raw);
    } satisfies Handler;
  };
};
