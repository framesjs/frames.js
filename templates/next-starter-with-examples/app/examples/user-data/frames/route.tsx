/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";

const handleRequest = frames(async (ctx) => {
  const message = ctx.message;

  return {
    image: message ? (
      <div style={{ display: "flex", flexDirection: "column" }}>
        GM, {message.requesterUserData?.displayName || "anonymous"}! Your FID is{" "}
        {message.requesterFid},{" "}
        {message.requesterFid < 20000
          ? "you're OG!"
          : "welcome to the Farcaster!"}
      </div>
    ) : (
      <div>Say GM</div>
    ),
    buttons: message ? [] : [<Button action="post">Say GM</Button>],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
