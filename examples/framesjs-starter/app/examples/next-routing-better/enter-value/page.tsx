import { FrameImage, FrameInput } from "frames.js/next/server";
import { RouterAppState } from "../types";
import { Frame, FrameLink } from "../api";

export default function EnterValueFrame() {
  return (
    <Frame>
      <FrameImage>
        <div>Please enter 1 or 0.</div>
      </FrameImage>
      <FrameInput text="Type 1 or 0"></FrameInput>
      <FrameLink to="/">← Back</FrameLink>
      <FrameLink
        to={(state: RouterAppState) => ({
          path: "/check-value",
          state: {
            ...state,
            answersCount: state.answersCount + 1,
          },
        })}
      >
        Check →
      </FrameLink>
    </Frame>
  );
}
