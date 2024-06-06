/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";
import { appURL } from "../../../utils";

const handleRequest = frames(async (ctx) => {
  return {
    // Add a random query param to ensure the frame action response image is not cached at dev time
    image: (
      <div tw="bg-purple-800 text-white w-full h-full justify-center items-center flex text-[48px]">
        The current time is {new Date().toLocaleString()}
      </div>
    ),
    imageOptions: {
      headers: {
        "Cache-Control": "public, max-age=0",
      },
    },
    buttons: [<Button action="post">Refresh</Button>],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
