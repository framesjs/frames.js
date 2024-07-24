import { neynarValidate } from "frames.js/middleware/neynar";
import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/neynar/frames",
  baseUrl: appURL(),
  middleware: [
    neynarValidate({
      API_KEY: "NEYNAR_API_DOCS",
    }),
  ],
  debug: process.env.NODE_ENV === "development",
});
