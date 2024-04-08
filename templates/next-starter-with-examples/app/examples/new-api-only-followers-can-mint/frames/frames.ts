import { farcasterHubContext } from "frames.js/middleware";
import { createFrames } from "frames.js/next";
import { DEFAULT_DEBUGGER_HUB_URL } from "../../../debug";

export const frames = createFrames({
  basePath: "/examples/new-api-only-followers-can-mint/frames",
  middleware: [
    farcasterHubContext({
      hubHttpUrl: DEFAULT_DEBUGGER_HUB_URL,
    }),
  ],
});
