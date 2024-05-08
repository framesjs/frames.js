/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "../frames";

const handler = frames(async (ctx) => {
  return {
    image: new URL('/bitmap.bmp', ctx.baseUrl).toString(),
    buttons: [
      <Button action="post" target="/">Go Back</Button>
    ],
  };
});

export const GET = handler;
export const POST = handler;
