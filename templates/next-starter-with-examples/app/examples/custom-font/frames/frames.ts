import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/custom-font/frames",
  baseUrl: appURL(),
});
