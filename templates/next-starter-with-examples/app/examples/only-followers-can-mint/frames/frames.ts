import { farcasterHubContext } from "frames.js/middleware";
import { createFrames } from "frames.js/next";
import { DEFAULT_DEBUGGER_HUB_URL } from "../../../debug";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/only-followers-can-mint/frames",
  baseUrl: appURL(),
  debug: process.env.NODE_ENV === "development",
  middleware: [
    farcasterHubContext({
      hubHttpUrl: DEFAULT_DEBUGGER_HUB_URL,
    }),
  ],
});
