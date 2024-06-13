import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/inline-images/frames",
  baseUrl: appURL(),
  // Setting imagesRoute to null disables the images worker middleware
  imagesRoute: null,
  debug: process.env.NODE_ENV === "development",
});
