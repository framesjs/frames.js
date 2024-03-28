import { ActionFunction, LoaderFunction } from '@remix-run/node';
import { createFrames, types } from '.';

type Handler = LoaderFunction | ActionFunction;

const framesWithoutState = createFrames();
framesWithoutState(async ctx => {
  ctx.initialState satisfies types.JsonValue | undefined;
  ctx.state satisfies types.JsonValue | undefined;

  return {
    image: 'http://test.png'
  };
}) satisfies Handler;

const framesWithInferredState = createFrames({
  initialState: {
    test: true
  }
});
framesWithInferredState(async ctx => {
  ctx.initialState satisfies { test: boolean; };
  ctx.state satisfies {
    test: boolean;
  };

  return {
    image: 'http://test.png'
  };
}) satisfies Handler;

const framesWithExplicitState = createFrames<{
  test: boolean;
}>({});
framesWithExplicitState(async ctx => {
  ctx.state satisfies {
    test: boolean;
  };
  ctx.initialState satisfies {
    test: boolean;
  };
  ctx satisfies {
    message?: any;
    pressedButton?: any;
    request: Request;
  }

  return {
    image: 'http://test.png'
  };
}) satisfies Handler;