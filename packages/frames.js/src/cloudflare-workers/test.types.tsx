import type { ExecutionContext, Request as CfRequest, ExportedHandlerFetchHandler } from '@cloudflare/workers-types';
import type { types } from '.';
import { createFrames } from '.';

const framesWithoutState = createFrames();
framesWithoutState(async (ctx) => {
  ctx.initialState satisfies types.JsonValue | undefined;
  ctx.state satisfies types.JsonValue | undefined; 

  return {
    image: 'http://test.png',
  };
}) satisfies ExportedHandlerFetchHandler;

const framesWithInferredState = createFrames({
  initialState: { test: true },
});

framesWithInferredState(async (ctx) => {
  ctx.state satisfies { test: boolean; };

  return {
    image: 'http://test.png',
  };
}) satisfies ExportedHandlerFetchHandler;

const framesWithExplicitState = createFrames<{ test: boolean }>({});
framesWithExplicitState(async (ctx) => {
  ctx.state satisfies { test: boolean };
  ctx satisfies { initialState?: {test: boolean}; message?: unknown, pressedButton?: unknown };
  ctx satisfies { cf: { env: unknown; ctx: ExecutionContext; req: CfRequest }}

  return {
    image: 'http://test.png',
  };
}) satisfies ExportedHandlerFetchHandler;

const framesWithExplicitStateAndEnv = createFrames<{ test: boolean }, { secret: string }>({});
framesWithExplicitStateAndEnv(async (ctx) => {
  ctx.state satisfies { test: boolean };
  ctx satisfies { initialState?: { test: boolean }; message?: unknown, pressedButton?: unknown; request: Request; };
  ctx satisfies { cf: { env: { secret: string }; ctx: ExecutionContext; req: CfRequest }}

  return {
    image: 'http://test.png',
  };
}) satisfies ExportedHandlerFetchHandler<{ secret: string }>;