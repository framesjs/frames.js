import type {
  Handler as ExpressHandler,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import type { types } from "../core";
import { createFrames as coreCreateFrames } from "../core";
import type { CoreMiddleware } from "../middleware";
import {
  convertNodeJSRequestToWebAPIRequest,
  sendWebAPIResponseToNodeJSResponse,
} from "../lib/node-server-helpers";

export { Button, type types } from "../core";

type CreateFramesForExpress = types.CreateFramesFunctionDefinition<
  CoreMiddleware,
  ExpressHandler
>;

/**
 * Creates Frames instance to use with you Express.js server
 *
 * @example
 * ```tsx
 * import { createFrames, Button } from 'frames.js/express';
 * import express from 'express';
 *
 * const app = express();
 * const frames = createFrames();
 * const expressHandler = frames(async (ctx) => {
 *  return {
 *   image: <span>Test</span>,
 *    buttons: [
 *    <Button action="post">
 *      Click me
 *    </Button>,
 *  ],
 * };
 *
 * app.use("/", expressHandler);
 * ```
 */
// @ts-expect-error -- this code is correct just function doesn't satisfy the type
export const createFrames: CreateFramesForExpress =
  function createFramesForExpress(options?: types.FramesOptions<any, any>) {
    const frames = coreCreateFrames(options);

    return function expressFramesHandler<
      TPerRouteMiddleware extends types.FramesMiddleware<any, any>[],
    >(
      handler: types.FrameHandlerFunction<any, any>,
      handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
    ) {
      const framesHandler = frames(handler, handlerOptions);

      return function handleExpressRequest(
        req: ExpressRequest,
        res: ExpressResponse
      ) {
        // convert express.js req to Web API Request
        const response = framesHandler(
          convertNodeJSRequestToWebAPIRequest(req, res)
        );

        Promise.resolve(response)
          .then((resolvedResponse) =>
            sendWebAPIResponseToNodeJSResponse(res, resolvedResponse)
          )
          .catch((error) => {
            // eslint-disable-next-line no-console -- provide feedback
            console.error(error);
            res.writeHead(500, { "content-type": "text/plain" });
            res.end("Inernal server error");
          });
      };
    };
  };
