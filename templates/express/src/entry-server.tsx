import { farcasterHubContext } from "frames.js/middleware";
import { createFrames, Button } from 'frames.js/express';

const frames = createFrames({
  middleware: [
    farcasterHubContext({
      // remove if you aren't using @frames.js/debugger or you just don't want to use the debugger hub
      ...(process.env.NODE_ENV === "production"
        ? {}
        : {
            hubHttpUrl: "http://localhost:3010/hub",
          }),
    }),
  ],
});

export const handleRequest = frames(async (ctx) => {
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