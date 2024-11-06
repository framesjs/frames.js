import { Button } from "frames.js/next";
import { frames } from "./frames";

const handleRequest = frames(async (ctx) => {
  if (!ctx.message) {
    return {
      image: (
        <div>
          This is the initial frame which will be shown before the user has
          interacted with the frame.
        </div>
      ),
      buttons: [<Button action="post">Say hello</Button>],
    };
  }

  if (!ctx.message.isValid) {
    throw new Error("Invalid message");
  }

  return {
    image: (
      <div>
        Hello {ctx.message.requesterUserData?.displayName}! Your FID is{" "}
        {ctx.message.requesterFid}
      </div>
    ),
    buttons: [],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
