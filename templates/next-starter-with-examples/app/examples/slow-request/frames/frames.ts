import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/slow-request/frames",
  baseUrl: appURL(),
});
