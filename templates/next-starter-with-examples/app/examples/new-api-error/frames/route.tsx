/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";
import { error } from "frames.js/core";

const handler = frames(async (ctx) => {
  if (ctx.message) {
    if (!ctx.message.inputText) {
      console.log("error");
      error("Invalid input: Empty text");
    }
  }

  return {
    image: ctx.message?.inputText ? (
      <div tw="flex">Entered text: {ctx.message.inputText}</div>
    ) : (
      <div tw="flex flex-col">
        <div tw="flex">Enter text</div>
        <div tw="flex">Empty text input will throw an error</div>
      </div>
    ),
    textInput: "Enter text or leave empty",
    buttons: [<Button action="post">Enter</Button>],
  };
});

export const GET = handler;
export const POST = handler;
