import { createFrames } from "frames.js/next";

type State = {
  count: number;
};

export const frames = createFrames<State>({
  initialState: {
    count: 0,
  },
  basePath: "/examples/new-api-state-via-query-params/frames",
});
