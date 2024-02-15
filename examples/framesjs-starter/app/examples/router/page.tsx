import { type NextServerPageProps } from "frames.js/next/server";
import { FrameRoute, FrameRouter } from "./components";
import { CheckValueFrame, EnterValueFrame, HomeFrame } from "./frames";
import { RouterAppState } from "./types";

export default async function RouteExample({
  searchParams,
}: NextServerPageProps) {
  return (
    <FrameRouter<RouterAppState>
      initialState={{ correctAnswer: 1, answersCount: 0 }}
      framesHandlerURL={"/examples/router/frames"}
      framesURL={"/examples/router"}
      {...{ searchParams }}
    >
      <FrameRoute path="/" component={HomeFrame} />
      <FrameRoute path="/enter-value" component={EnterValueFrame} />
      <FrameRoute path="/check-value" component={CheckValueFrame} />
    </FrameRouter>
  );
}
