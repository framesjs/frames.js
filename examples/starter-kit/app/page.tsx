import {
  FrameContainer,
  FrameImage,
  FrameButton,
  FrameReducer,
  useFramesReducer,
  getPreviousFrame,
  validateActionSignature,
  FrameInput,
} from "frames.js/next/server";

type State = {
  active: string;
};

const initialState = { active: "1" };

const reducer: FrameReducer<State> = (state, action) => {
  return {
    active: action.postBody?.untrustedData.buttonIndex
      ? String(action.postBody?.untrustedData.buttonIndex)
      : "1",
  };
};

// This is a react server component only
export default async function Home({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const previousFrame = getPreviousFrame<State>(searchParams);
  await validateActionSignature(previousFrame.postBody);
  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT

  // then, when done, return next frame
  return (
    <div>
      Frames-jsx example
      <FrameContainer
        postUrl="http://localhost:3000/api/frames"
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage src="https://picsum.photos/seed/frames.js/1146/600" />
        <FrameInput text="put some text here" />
        <FrameButton onClick={dispatch}>
          {state?.active === "1" ? "Active" : "Inactive"}
        </FrameButton>
        <FrameButton onClick={dispatch}>
          {state?.active === "2" ? "Active" : "Inactive"}
        </FrameButton>
        <FrameButton href={`http://localhost:3000/`}>Page link</FrameButton>
        <FrameButton href={`https://www.google.com`}>External link</FrameButton>
      </FrameContainer>
    </div>
  );
}
