/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";

const handleRequest = frames(async (ctx) => {
  return {
    image: (
      <div tw="bg-purple-800 text-white w-full h-full justify-center items-center flex text-[48px]">
        The current time is {new Date().toLocaleString()}
      </div>
    ),
    imageOptions: {
      // Tell the client how long to cache the image for using the Cache-Control header
      headers: {
        "Cache-Control": "public, max-age=0",
      },
    },
    buttons: [<Button action="post">Refresh</Button>],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
