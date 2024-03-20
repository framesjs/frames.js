/* eslint-disable react/jsx-key */
import { Button } from "@frames.js/next";
import { frames } from "../frames";

const handleRequest = frames(async ({ clickedButton, message }) => {
  return {
    image: (
      <span>
        This is next frame and you clicked button: {clickedButton ? "✅" : "❌"}
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
