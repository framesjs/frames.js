/* eslint-disable react/jsx-key */
import { Button } from "@frames.js/next";
import { frames } from "../frames";

const handleRequest = frames(async ({ pressedButton, message }) => {
  return {
    image: (
      <span>
        This is next frame and you clicked button: {pressedButton ? "✅" : "❌"}
      </span>
    ),
    buttons: [
      <Button action="post" target="/">
        Previous frame
      </Button>,
    ],
  };
});

export const POST = handleRequest;
