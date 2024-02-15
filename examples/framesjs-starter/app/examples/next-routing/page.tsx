import { FrameImage, type NextServerPageProps } from "frames.js/next/server";
import { FrameLink, currentFrame } from "./components";
import { initialState, Frame } from "./types";

export default async function RouteExample({
  searchParams,
}: NextServerPageProps) {
  const frame = currentFrame({ searchParams, initialState });

  return (
    <Frame {...{ frame }}>
      <FrameImage>
        <div>Hello world</div>
      </FrameImage>
      <FrameLink to="/enter-value">Enter →</FrameLink>
    </Frame>
  );
}
