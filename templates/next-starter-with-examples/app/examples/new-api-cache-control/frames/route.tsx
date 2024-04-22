/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";
import { appURL } from "../../../utils";

const handleRequest = frames(async (ctx) => {
  return {
    // Separate image response because cache control headers need to be set on the image response
    // Add a random query param to ensure the frame action response image is not cached
    image: `/images/current-time?t=${Math.random()}`,
    buttons: [<Button action="post">Refresh</Button>],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
