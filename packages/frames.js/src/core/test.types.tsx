import { createFrames, types } from '.';

type Handler = (req: Request) => Promise<Response>;

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
  ctx satisfies { initialState?: {test: boolean}; message?: any, pressedButton?: any };

  return {
    image: 'http://test.png',
  };
}) satisfies Handler;

const framesWithExplicitStateAndEnv = createFrames<{ test: boolean }>({});
framesWithExplicitStateAndEnv(async (ctx) => {
  ctx.state satisfies { test: boolean };
  ctx satisfies { initialState?: { test: boolean }; message?: any, pressedButton?: any; request: Request; };


  return {
    image: 'http://test.png',
  };
}) satisfies Handler;