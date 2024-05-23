import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  baseUrl: `${appURL()}/examples/cast-actions/frames`,
});
