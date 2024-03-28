import { createFrames } from "frames.js/next";

export const frames = createFrames({
  basePath: "/frames",
  initialState: { counter: 0 },
});
