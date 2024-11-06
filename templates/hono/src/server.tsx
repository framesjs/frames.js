import { farcasterHubContext } from "frames.js/middleware";
import { createFrames, Button } from 'frames.js/hono';
import { Hono } from 'hono';
import { serve } from "@hono/node-server";

const app = new Hono();

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

app.get('/', handleRequest);
app.post('/', handleRequest);

// expose app for `@hono/vite-dev-server`
export default app;

if (process.env.NODE_ENV === 'production') {
  serve({ ...app, port: 3000 }, info => {
    console.log(`Server running on http://localhost:${info.port}`);
  })
}