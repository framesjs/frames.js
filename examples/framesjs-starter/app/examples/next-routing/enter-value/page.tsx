import {
  FrameImage,
  FrameInput,
  NextServerPageProps,
} from "frames.js/next/server";
import { FrameLink, currentFrame } from "../components";
import { Frame, RouterAppState, initialState } from "../types";

export default function EnterValueFrame({ searchParams }: NextServerPageProps) {
  const frame = currentFrame({ searchParams, initialState });

  return (
    <Frame {...{ frame }}>
      <FrameImage>
        <div>Please enter 1 or 0.</div>
      </FrameImage>
      <FrameInput text="Type 1 or 0"></FrameInput>
      <FrameLink to="/">← Back</FrameLink>
      <FrameLink<RouterAppState>
        to={(state) => ({
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
