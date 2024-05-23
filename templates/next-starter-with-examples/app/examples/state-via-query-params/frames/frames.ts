import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

type State = {
  count: number;
};

export const frames = createFrames<State>({
  initialState: {
    count: 0,
  },
  basePath: "/examples/state-via-query-params/frames",
  baseUrl: appURL(),
});
