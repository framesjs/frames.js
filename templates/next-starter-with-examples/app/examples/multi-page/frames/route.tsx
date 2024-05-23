/* eslint-disable react/jsx-key */
import { frames } from "./frames";
import { Button } from "frames.js/next";

const handler = frames(async () => {
  return {
    image: <div tw="flex">Welcome</div>,
    buttons: [
      // With query params
      <Button
        action="post"
        target={{ pathname: "/route1", query: { foo: "bar" } }}
      >
        Go to route 1
      </Button>,
      // Without query params
      <Button action="post" target="/route2">
        Go to route 2
      </Button>,
    ],
  };
});

export const GET = handler;
export const POST = handler;
