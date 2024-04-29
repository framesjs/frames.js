import type { NextRequest, NextResponse } from "next/server";
import type { types } from "../core";
import { createFrames as coreCreateFrames } from "../core";
import type { CoreMiddleware } from "../middleware";

export { Button, type types } from "../core";

export { fetchMetadata } from "./fetchMetadata";

export type CreateFramesReturn = types.CreateFramesFunctionDefinition<
  CoreMiddleware,
  (req: NextRequest) => Promise<NextResponse>
>;

/**
 * Creates Frames instance to use with you Next.js server
 *
 * @example
 * ```tsx
 * import { createFrames, Button } from 'frames.js/next';
 * import { NextApiRequest, NextApiResponse } from 'next';
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
 * export const GET = nextHandler;
 * export const POST = nextHandler;
 * ```
 */
// @ts-expect-error -- this is correct but the function does not satisfy the type
export const createFrames: CreateFramesReturn =
  function createFramesForNextJS(options?: types.FramesOptions<any, any>) {
    const frames = coreCreateFrames(options);

    return function createHandler<
      TPerRouteMiddleware extends types.FramesMiddleware<any, any>[],
    >(
      handler: types.FrameHandlerFunction<any, any>,
      handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
    ) {
      const handleRequest = frames(handler, handlerOptions);

      return (req) => {
        return handleRequest(new Request(req.nextUrl.toString(), req));
      };
    };
  };
