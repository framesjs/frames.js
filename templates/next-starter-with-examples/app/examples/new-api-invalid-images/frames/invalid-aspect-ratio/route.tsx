/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "../frames";

const handler = frames(async () => {
  return {
    // 20x20 image
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAlElEQVR4nO2UQQrEIAxFe/8jSRUrKtZFEasIQs7yh3RRKEOnixmYjYsQ0OT5E2ImIsIvbRpAjB7iq7GptcIYg947rLUopbwl5JzPGPattXtgSgkhBAghsG3b4fncOQfv/RnDIL7jB+d5/qxQKYV1XS9ArTWWZbkoZHsExhgPICfdlcxKpZTY9/25ZBp/mcb6on9s7Bc+TJAvSO7XjwAAAABJRU5ErkJggg==",
    imageOptions: {
      aspectRatio: '1.91:1',
    },
    buttons: [
      <Button action="post" target="/">Go Back</Button>
    ],
  };
});

export const GET = handler;
export const POST = handler;
