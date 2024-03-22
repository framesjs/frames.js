import {
  DefaultMiddleware,
  createFrames as coreCreateFrames,
  types,
} from "../core";
import type { NextRequest, NextResponse } from "next/server";
export { Button, type types } from "../core";

export { fetchMetadata } from "./fetchMetadata";

type CreateFramesForNextJS = types.CreateFramesFunctionDefinition<
  DefaultMiddleware,
  (req: NextRequest) => Promise<NextResponse>
>;

/**
 * Creates Frames instance to use with you Next.js server
 *
 * @example
 * import { createFrames, Button } from 'frames.js/next';
 * import { NextApiRequest, NextApiResponse } from 'next';
 *
 * const frames = createFrames();
 * const nextHandler = frames(async ({ request }) => {
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
 * export const GET = nextHandler;
 * export const POST = nextHandler;
 */
// @ts-expect-error
export const createFrames: CreateFramesForNextJS =
  function createFramesForNextJS(options?: types.FramesOptions<any, any>) {
    const frames = coreCreateFrames(options);

    return function createHandler<
      TPerRouteMiddleware extends types.FramesMiddleware<any>[],
    >(
      handler: types.FrameHandlerFunction<any, any>,
      handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
    ) {
      return frames(handler, handlerOptions) as unknown as (
        req: NextRequest
      ) => Promise<NextResponse>;
    };
  };
