import { createFrames } from "frames.js/next";
import { farcasterHubContext } from "frames.js/middleware";
import { appURL } from "../../../utils";
import { DEFAULT_DEBUGGER_HUB_URL } from "../../../debug";

export const frames = createFrames({
  basePath: "/examples/user-data/frames",
  baseUrl: appURL(),
  middleware: [
    farcasterHubContext({
      hubHttpUrl: DEFAULT_DEBUGGER_HUB_URL,
    }),
  ],
  debug: process.env.NODE_ENV === "development",
});
