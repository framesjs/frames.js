/* eslint-disable @typescript-eslint/require-await  -- we are checking compatibility with promises */
import type { types } from '.';
import { createFrames } from '.';

type Handler = (req: Request) => Promise<Response> | Response;

const framesWithoutState = createFrames();
framesWithoutState(async (ctx) => {
  ctx.initialState satisfies types.JsonValue | undefined;
  ctx.state satisfies types.JsonValue | undefined;

  return {
    image: 'http://test.png',
  };
}) satisfies Handler;

const framesWithInferredState = createFrames({
  initialState: { test: true },
});

framesWithInferredState(async (ctx) => {
  ctx.state satisfies { test: boolean };

  return {
    image: 'http://test.png',
  };
}) satisfies Handler;

const framesWithExplicitState = createFrames<{ test: boolean }>({});
framesWithExplicitState(async (ctx) => {
  ctx.state satisfies { test: boolean };
  ctx satisfies { initialState?: {test: boolean}; message?: unknown, pressedButton?: unknown };

  return {
    image: 'http://test.png',
  };
}) satisfies Handler;

const framesWithExplicitStateAndEnv = createFrames<{ test: boolean }>({});
framesWithExplicitStateAndEnv(async (ctx) => {
  ctx.state satisfies { test: boolean };
  ctx satisfies { initialState?: { test: boolean }; message?: unknown, pressedButton?: unknown; request: Request; };


  return {
    image: 'http://test.png',
  };
}) satisfies Handler;

const framesWithExplicitStateAndEnvNoPromise = createFrames<{ test: boolean }>({});
framesWithExplicitStateAndEnvNoPromise((ctx) => {
  ctx.state satisfies { test: boolean };
  ctx satisfies { initialState?: { test: boolean }; message?: unknown, pressedButton?: unknown; request: Request; };


  return {
    image: 'http://test.png',
  };
}) satisfies Handler;