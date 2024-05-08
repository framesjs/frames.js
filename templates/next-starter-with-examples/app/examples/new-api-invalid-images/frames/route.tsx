/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";

const handler = frames(async () => {
  return {
    image: <div tw="flex">Choose an error</div>,
    buttons: [
      <Button action="post" target="/invalid-image">
        Invalid image
      </Button>,
      <Button action="post" target="/invalid-aspect-ratio">
        Aspect ratio
      </Button>,
      <Button action="post" target="/invalid-image-type">
        Invalid image type
      </Button>,
    ],
  };
});

export const GET = handler;
export const POST = handler;
