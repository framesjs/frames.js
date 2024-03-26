/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";

const handler = frames(async (ctx) => {
  return {
    image: <div tw="flex">ETH price: ${ctx.ethPrice}</div>,
    buttons: [<Button action="post">Refresh</Button>],
  };
});

export const GET = handler;
export const POST = handler;
