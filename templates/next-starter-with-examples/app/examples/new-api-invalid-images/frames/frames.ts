import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/new-api-invalid-images/frames",
  baseUrl: appURL(),
});
