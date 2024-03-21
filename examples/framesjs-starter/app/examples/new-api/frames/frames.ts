import { createFrames } from "frames.js/next";

// @todo here is issue with exporting, ts2742, how to fix it?
export const frames = createFrames({
  basePath: "/examples/new-api/frames",
});
