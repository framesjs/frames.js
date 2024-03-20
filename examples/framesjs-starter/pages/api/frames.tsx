/* eslint-disable react/jsx-key */
import { createFrames, Button } from "@frames.js/next/pages-router";

const frames = createFrames({
  basePath: "/api",
});
const handleRequest = frames(async ({ clickedButton, message }) => {
  return {
    image: (
      <span>
        Hello there: {clickedButton ? "✅" : "❌"}
        {message?.inputText ? `, Typed: ${message?.inputText}` : ""}
      </span>
    ),
    buttons: [<Button action="post">Click me</Button>],
    textInput: "Type something!",
  };
});

export default handleRequest;
