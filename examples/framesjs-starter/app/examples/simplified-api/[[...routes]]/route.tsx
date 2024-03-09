import { AnyJson } from "../new-api";
import {
  FrameImage,
  Frame,
  FramesApp,
  FrameLink,
  renderFramesToResponse,
} from "../react-api";

type FrameState = {
  clicked: number;
};

function isFrameState(
  frameState: AnyJson | undefined
): frameState is FrameState {
  if (frameState && typeof frameState === "object" && "clcked" in frameState) {
    return typeof frameState.clicked === "number";
  }

  return false;
}

export const framesApp = (
  <FramesApp>
    <Frame index>
      {({ frameState }) => (
        <>
          <FrameImage>
            <div>Test</div>
          </FrameImage>
          <FrameLink
            path="/next"
            label="Next"
            state={{
              clicked: isFrameState(frameState) ? frameState.clicked + 1 : 1,
            }}
          ></FrameLink>
        </>
      )}
    </Frame>
    <Frame path="/next">
      {({ frameState }) => (
        <>
          <FrameImage>
            <div>
              Click #
              {isFrameState(frameState)
                ? frameState.clicked
                : "Not clicked yet"}
            </div>
          </FrameImage>
          <FrameLink path="/" label="Back"></FrameLink>
        </>
      )}
    </Frame>
  </FramesApp>
);

/**
 * GET renders always only initial frames
 */
export async function GET(req: Request) {
  return renderFramesToResponse(framesApp, req);
}

/**
 * POST always render subsequent frames in reaction to buttons
 */
export async function POST(req: Request) {
  return renderFramesToResponse(framesApp, req);
}
