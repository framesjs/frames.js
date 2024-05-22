/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";

const handler = frames(async (ctx) => {
  const currentState = ctx.state;

  const updatedState = {
    ...currentState,
    count: ctx.pressedButton ? currentState.count + 1 : currentState.count,
  };

  return {
    image: <div tw="flex">Count: {updatedState.count}</div>,
    buttons: [<Button action="post">Increment</Button>],
    state: updatedState,
  };
});

export const GET = handler;
export const POST = handler;
