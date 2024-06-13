import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

type State = {
  count: number;
};

export const frames = createFrames<State>({
  initialState: {
    count: 0,
  },
  basePath: "/examples/state-signing/frames",
  baseUrl: appURL(),
  stateSigningSecret: "my-secret-key",
  debug: process.env.NODE_ENV === "development",
});
