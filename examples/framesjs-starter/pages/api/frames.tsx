/* eslint-disable react/jsx-key */
import { createFrames, Button } from "frames.js/next/pages-router";

const frames = createFrames({
  basePath: "/api/frames",
});
const handleRequest = frames(async ({ pressedButton, message }) => {
  return {
    image: (
      <span>
        Hello there: {pressedButton ? "✅" : "❌"}
        {message?.inputText ? `, Typed: ${message?.inputText}` : ""}
      </span>
    ),
    buttons: [
      <Button action="post" target="/">
        Click me
      </Button>,
    ],
    textInput: "Type something!",
  };
});

export default handleRequest;
