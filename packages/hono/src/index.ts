export { Button, type types } from "frames.js/core";
import {
  DefaultMiddleware,
  createFrames as coreCreateFrames,
  types,
} from "frames.js/core";
import type { Handler } from "hono";

type CreateFramesForHono = types.CreateFramesFunctionDefinition<
  DefaultMiddleware,
  Handler
>;

export const createFrames: CreateFramesForHono = function createFramesForHono(
  options: types.FramesOptions<any>
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
