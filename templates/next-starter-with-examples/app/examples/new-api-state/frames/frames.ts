import { createFrames } from "frames.js/next";

export type State = {
  count: number;
};

export const frames = createFrames<State>({
  basePath: "/examples/new-api-state/frames",
  initialState: {
    count: 0,
  },
});
