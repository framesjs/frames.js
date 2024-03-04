import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameReducer,
  NextServerPageProps,
  getPreviousFrame,
  useFramesReducer,
} from "frames.js/next/server";
import Link from "next/link";
import { currentURL } from "../../utils";
import { createDebugUrl } from "../../debug";

type State = {
  pageIndex: number;
};

const initialState: State = { pageIndex: 0 };

const reducer: FrameReducer<State> = (state, action) => {
  return {
    pageIndex: 0,
  };
};

// This is a react server component only
export default async function Home({ searchParams }: NextServerPageProps) {
  const url = currentURL("/examples/transaction");
  const previousFrame = getPreviousFrame<State>(searchParams);
  const [state] = useFramesReducer<State>(reducer, initialState, previousFrame);

  // then, when done, return next frame
  return (
    <div>
      Rent farcaster storage example{" "}
      <Link href={createDebugUrl(url)}>Debug</Link>
      <FrameContainer
        pathname="/examples/transaction"
        postUrl="/examples/transaction/frames"
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage aspectRatio="1:1">
          <div tw="bg-purple-800 text-white w-full h-full justify-center items-center">
            Rent farcaster storage
          </div>
        </FrameImage>
        <FrameButton action="tx" target="/examples/transaction/txdata">
          Buy a unit
        </FrameButton>
      </FrameContainer>
    </div>
  );
}
