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

const handleRequest = frames(async ctx => {
  return {
    image: ctx.message ? (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        GM, {ctx.message.requesterUserData?.displayName}! Your FID is{" "}
        {ctx.message.requesterFid}
        {", "}
        {ctx.message.requesterFid < 20_000
          ? "you're OG!"
          : "welcome to the Farcaster!"}
      </div>
    ) : (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        Say GM
      </div>
    ),
    buttons: !ctx.url.searchParams.has("saidGm")
      ? [
          <Button action="post" key="1" target={{ query: { saidGm: true } }}>
            Say GM
          </Button>,
        ]
      : [],
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