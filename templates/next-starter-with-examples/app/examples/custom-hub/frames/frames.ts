import { createFrames } from "frames.js/next";
import { farcasterHubContext } from "frames.js/middleware";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/custom-hub/frames",
  baseUrl: appURL(),
  middleware: [
    farcasterHubContext({
      hubHttpUrl: "https://hub.freefarcasterhub.com:3281",
    }),
  ],
  debug: process.env.NODE_ENV === "development",
});
