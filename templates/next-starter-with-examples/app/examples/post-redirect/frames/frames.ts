import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/post-redirect/frames",
  baseUrl: appURL(),
});
