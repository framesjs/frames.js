/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { createFrames } from "frames.js/next";

const frames = createFrames({
  basePath: "/examples/new-api-cache-control",
});

const handleRequest = frames(async (ctx) => {
  return {
    image: (
      <div tw="bg-purple-800 text-white w-full h-full justify-center items-center flex">
        The current time is {new Date().toLocaleString()}
      </div>
    ),
    imageOptions: {
      aspectRatio: "1:1",
    },
    buttons: [<Button action="post">Refresh</Button>],
    headers: {
      // Max cache age in seconds
      "Cache-Control": "max-age=5",
    },
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
