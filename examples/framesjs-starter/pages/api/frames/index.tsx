/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next/pages-router/client";
import { frames } from "./frames";

const handleRequest = frames(async (ctx) => {
  return {
    image: (
      <span>
        Hello there: {ctx.pressedButton ? "✅" : "❌"}
        {ctx.message?.inputText ? `, Typed: ${ctx.message?.inputText}` : ""}
      </span>
    ),
    buttons: [
      <Button action="post">Click me</Button>,
      <Button action="post" target="/next">
        Next frame
      </Button>,
    ],
    textInput: "Type something!",
  };
});

export default handleRequest;
