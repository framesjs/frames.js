import { FrameImage } from "frames.js/next/server";
import { Frame, FrameLink, FrameButton } from "./api";

export default async function RouteExample() {
  return (
    <Frame>
      <FrameImage>
        <div>Hello world</div>
      </FrameImage>
      <FrameLink to="/enter-value">Enter →</FrameLink>
      <FrameButton action="link" target="https://framesjs.org">
        External
      </FrameButton>
      <FrameButton action="post_redirect" target="https://framesjs.org">
        Redirect
      </FrameButton>
    </Frame>
  );
}
