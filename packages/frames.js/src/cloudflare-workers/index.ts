export { Button, type types } from "../core";
import { createFrames as coreCreateFrames, types } from "../core";
import { CoreMiddleware } from "../middleware";
import { Buffer } from "node:buffer";

// make Buffer available on globalThis so it is compatible with cloudflare workers
// eslint-disable-next-line no-undef
globalThis.Buffer = Buffer;

type CreateFramesForCloudflareWorkers = types.CreateFramesFunctionDefinition<
  CoreMiddleware,
  (req: Request) => Promise<Response>
>;

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
 * export default {
 *  fetch,
 * } satisfies ExportedHandler;
 */
// @ts-expect-error
export const createFrames: CreateFramesForCloudflareWorkers =
  function createFramesForCloudflareWorkers(
    options?: types.FramesOptions<any, any>
  ) {
    const frames = coreCreateFrames(options);

    return function cloudflareWorkersFramesHandler<
      TPerRouteMiddleware extends types.FramesMiddleware<any, any>[],
    >(
      handler: types.FrameHandlerFunction<any, any>,
      handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
    ) {
      const framesHandler = frames(handler, handlerOptions);

      return async function handleCloudflareWorkersRequest(req) {
        return framesHandler(req);
      };
    };
  };
