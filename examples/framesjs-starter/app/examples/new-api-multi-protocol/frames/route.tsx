import { Button } from "frames.js/next";
import { frames } from "../frames";

const handleRequest = frames(async (ctx) => {
  return {
    image: (
      <div tw="flex flex-col">
        <div tw="flex">Click the button</div>
      </div>
    ),
    buttons: [
      <Button action="post" key="1" target="/who-am-i">
        Who am I?
      </Button>,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
