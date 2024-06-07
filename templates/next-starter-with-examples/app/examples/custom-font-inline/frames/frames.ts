import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/custom-font-inline/frames",
  baseUrl: appURL(),
  debug: process.env.NODE_ENV === "development",
  // Set imagesRoute to null to enable inline images
  imagesRoute: null,
});
