/* eslint-disable react/jsx-key */

import { Button } from "frames.js/next";
import { frames } from "./frames";

const handler = frames(async (ctx) => {
  if (ctx.message?.inputText) {
    return {
      image: <div>Press the button to visit the path</div>,
      buttons: [
        <Button action="post" target={ctx.message.inputText}>
          {`Go to /${ctx.message.inputText}`}
        </Button>,
      ],
    };
  }

  return {
    image: <div>Enter a path to load</div>,
    textInput: "Enter path",
    buttons: [<Button action="post">Go</Button>],
  };
});

export const GET = handler;
export const POST = handler;
