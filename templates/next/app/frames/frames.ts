import { farcasterHubContext } from "frames.js/middleware";
import { createFrames } from "frames.js/next";

export const frames = createFrames({
  basePath: "/frames",
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
