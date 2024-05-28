import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/multi-page/frames",
  baseUrl: appURL(),
  debug: process.env.NODE_ENV === "development",
});
