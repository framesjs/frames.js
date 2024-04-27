// eslint-disable-next-line import/no-extraneous-dependencies -- devDependencies are installed in the CI
import type { Handler } from "elysia";
import type { types } from "../core";
import { createFrames as coreCreateFrames } from "../core";
import type { CoreMiddleware } from "../middleware";

export { Button, type types } from "../core";

type CreateFramesForElysia = types.CreateFramesFunctionDefinition<
  CoreMiddleware,
  Handler
>;

/**
 * Creates Frames instance to use with you Elysia server
 *
 * @example
 * ```tsx
 * import { createFrames, Button } from 'frames.js/elysia';
 * import { Elysia } from 'elysia';
 *
 * const frames = createFrames();
 * const ElysiaHandler = frames(async (ctx) => {
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
 * const app = new Elysia();
 *
 * app.get('/', ElysiaHandler)
 *    .post('/', ElysiaHandler)
 *    .listen(3000);
 * ```
 */
// @ts-expect-error -- this code is correct just function doesn't satisfy the type
export const createFrames: CreateFramesForElysia = function createFramesForElysia(
  options?: types.FramesOptions<types.JsonValue | undefined, undefined>
) {
  const frames = coreCreateFrames(options);

  return function elysiaFramesHandler<
    TPerRouteMiddleware extends types.FramesMiddleware<
      types.JsonValue | undefined,
      Record<string, unknown>
    >[],
  >(
    handler: types.FrameHandlerFunction<
      types.JsonValue | undefined,
      Record<string, unknown>
    >,
    handlerOptions?: types.FramesRequestHandlerFunctionOptions<TPerRouteMiddleware>
  ) {
    const framesHandler = frames(handler, handlerOptions);

    return async function handleElysiaRequest(c) {
      return framesHandler(new Request(c.request.url, {
        method: c.request.method,
        headers: c.request.headers,
        body: JSON.stringify((c.body as BodyInit)),
      }));
    } satisfies Handler;
  };
};
