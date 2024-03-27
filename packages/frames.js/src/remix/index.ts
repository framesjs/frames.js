import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { createFrames as coreCreateFrames, types } from "../core";
import type { CoreMiddleware } from "../middleware";
export { Button, type types } from "../core";

export { fetchMetadata } from "./fetchMetadata";

type CreateFramesForRemix = types.CreateFramesFunctionDefinition<
  CoreMiddleware,
  (args: LoaderFunctionArgs | ActionFunctionArgs) => Promise<Response>
>;

/**
 * Creates Frames instance to use with you Remix server
 *
 * @example
 * import { createFrames, Button } from 'frames.js/remix';
 * import type { LoaderFunction, ActionFunction } from '@remix-run/node';
 *
 * const frames = createFrames();
 * const remixHandler = frames(async (ctx) => {
 *  return {
 *    image: <span>Test</span>,
 *    buttons: [
 *      <Button action="post">
 *        Click me
 *      </Button>,
 *    ],
 *  };
 * });
 *
 * export const loader: LoaderFunction = remixHandler;
 * export const action: ActionFunction = remixHandler;
 */
// @ts-expect-error
export const createFrames: CreateFramesForRemix = function createFramesForRemix(
  options?: types.FramesOptions<any, any>
) {
  const frames = coreCreateFrames(options);

  return function createHandler<
    TPerRouteMiddleware extends types.FramesMiddleware<any, any>[],
  >(
    handler: types.FrameHandlerFunction<any, any>,
    handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
  ) {
    const requestHandler = frames(handler, handlerOptions);

    return function handleRemixAPIRequest({
      request,
    }: LoaderFunctionArgs | ActionFunctionArgs) {
      return requestHandler(request);
    };
  };
};
