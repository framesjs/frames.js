import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/new-api-error/frames",
  baseUrl: appURL(),
});
