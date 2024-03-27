/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";

const handler = frames(async (ctx) => {
  return {
    image: <div tw="flex">Custom fonts example</div>,
    buttons: [
      <Button action="post" target="/nodejs">
        Node.js runtime
      </Button>,
      <Button action="post" target="/edge">
        Edge function
      </Button>,
    ],
  };
});

export const GET = handler;
export const POST = handler;
