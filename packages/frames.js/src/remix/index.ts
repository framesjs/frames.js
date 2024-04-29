import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import type { types } from "../core";
import { createFrames as coreCreateFrames } from "../core";
import type { CoreMiddleware } from "../middleware";

export { Button, type types } from "../core";

export { fetchMetadata } from "./fetchMetadata";

export type CreateFramesReturn = types.CreateFramesFunctionDefinition<
  CoreMiddleware,
  (args: LoaderFunctionArgs | ActionFunctionArgs) => Promise<Response>
>;

/**
 * Creates Frames instance to use with you Remix server
 *
 * @example
 * ```tsx
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
 * ```
 */
// @ts-expect-error -- the function works fine but somehow it does not satisfy the expected type
export const createFrames: CreateFramesReturn = function createFramesForRemix(
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
