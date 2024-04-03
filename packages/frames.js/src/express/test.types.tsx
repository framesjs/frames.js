/* eslint-disable @typescript-eslint/require-await -- we want to test if the types are compatible */
import type { Handler } from 'express';
import type { types } from '.';
import { createFrames } from '.';

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
    message?: unknown;
    pressedButton?: unknown;
    request: Request;
  }

  return {
    image: 'http://test.png'
  };
}) satisfies Handler;

const framesWithExplicitStateNoPromise = createFrames<{
  test: boolean;
}>({});
framesWithExplicitStateNoPromise(ctx => {
  ctx.state satisfies {
    test: boolean;
  };
  ctx.initialState satisfies {
    test: boolean;
  };
  ctx satisfies {
    message?: unknown;
    pressedButton?: unknown;
    request: Request;
  }

  return {
    image: 'http://test.png'
  };
}) satisfies Handler;