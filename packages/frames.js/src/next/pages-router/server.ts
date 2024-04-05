import type { NextApiRequest, NextApiResponse } from "next";
import type { types } from "../../core";
import { createFrames as coreCreateFrames } from "../../core";
import type { CoreMiddleware } from "../../middleware";
import {
  convertNodeJSRequestToWebAPIRequest,
  sendWebAPIResponseToNodeJSResponse,
} from "../../lib/node-server-helpers";

export { type types } from "../../core";
export { Button } from "../../core/components";

type CreateFramesForNextJSApiHandler = types.CreateFramesFunctionDefinition<
  CoreMiddleware,
  (req: NextApiRequest, res: NextApiResponse) => Promise<void>
>;

/**
 * Creates Frames instance to use with you Next.js server API handler
 *
 * @example
 * ```tsx
 * import { createFrames, Button } from 'frames.js/next/pages-router/server';
 *
 * const frames = createFrames();
 * const nextHandler = frames(async (ctx) => {
 *  return {
 *    image: <span>Test</span>,
 *    buttons: [
 *     <Button action="post">
 *        Click me
 *      </Button>,
 *    ],
 *  };
 * });
 *
 * export default nextHandler;
 * ```
 */
// @ts-expect-error -- this code is correct just function doesn't satisfy the type
export const createFrames: CreateFramesForNextJSApiHandler =
  function createFramesForNextJSPagesRouter(
    options: types.FramesOptions<any, any>
  ) {
    const frames = coreCreateFrames(options);

    return function createHandler<
      TPerRouteMiddleware extends types.FramesMiddleware<any, any>[],
    >(
      handler: types.FrameHandlerFunction<any, any>,
      handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
    ) {
      const requestHandler = frames(handler, handlerOptions);

      return async function handleNextJSApiRequest(
        req: NextApiRequest,
        res: NextApiResponse
      ) {
        const response = await requestHandler(
          convertNodeJSRequestToWebAPIRequest(req, res)
        );
        await sendWebAPIResponseToNodeJSResponse(res, response);
      };
    };
  };
