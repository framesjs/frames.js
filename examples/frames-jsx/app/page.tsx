import {
  FFrame,
  FFrameImage,
  FFrameButton,
  FrameReducer,
  useFramesReducer,
  createFrameContextNextjs,
  validateFrameMessageOrThrow,
} from "frames.js";

type State = {
  active: string;
};

const initialState = { active: "1" };

const reducer: FrameReducer<State> = (state, action) => {
  return {
    active: action.frame_action_received?.untrustedData.buttonIndex
      ? String(action.frame_action_received?.untrustedData.buttonIndex)
      : "1",
  };
};

// This is a react server component only
export default async function Home({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const frameContext = createFrameContextNextjs<State>(searchParams);
  await validateFrameMessageOrThrow(frameContext.frame_action_received);
  const state = useFramesReducer<State>(reducer, initialState, frameContext);

  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT

  // then, when done, return next frame
  return (
    <div>
      Frames-jsx example
      <FFrame postRoute="http://localhost:3000/frames" state={state}>
        <FFrameImage src="https://picsum.photos/seed/frames.js/1146/600" />
        <FFrameButton>
          {state?.active === "1" ? "Active" : "Inactive"}
        </FFrameButton>
        <FFrameButton>
          {state?.active === "2" ? "Active" : "Inactive"}
        </FFrameButton>
        <FFrameButton>
          {state?.active === "3" ? "Active" : "Inactive"}
        </FFrameButton>
        <FFrameButton>
          {state?.active === "4" ? "Active" : "Inactive"}
        </FFrameButton>
      </FFrame>
    </div>
  );
}
