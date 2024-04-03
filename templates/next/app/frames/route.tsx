import { farcasterHubContext } from "frames.js/middleware";
import { createFrames, Button } from "frames.js/next";

const frames = createFrames({
  basePath: '/frames',
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
          <Button action="post" target={{ query: { saidGm: true } }}>
            Say GM
          </Button>,
        ]
      : [],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
