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
      dynamic: true,
      headers: {
        // make sure this is always equal or great than minimumCacheTTL when using Next.js Image component
        // @see https://nextjs.org/docs/app/api-reference/components/image#minimumcachettl
        "Cache-Control": "max-age=1",
      },
    },
    buttons: [<Button action="post">Refresh</Button>],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
