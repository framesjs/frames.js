import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  NextServerPageProps,
  getPreviousFrame,
  useFramesReducer,
  validateActionSignature,
} from "frames.js/next/server";
import Link from "next/link";
import { DEBUG_HUB_OPTIONS } from "../../debug/constants";

type State = {
  active: string;
  total_button_presses: number;
};

const initialState = { active: "1", total_button_presses: 0 };

const reducer: FrameReducer<State> = (state, action) => {
  return {
    total_button_presses: state.total_button_presses + 1,
    active: action.postBody?.untrustedData.buttonIndex
      ? String(action.postBody?.untrustedData.buttonIndex)
      : "1",
  };
};

// This is a react server component only
export default async function Home({
  params,
  searchParams,
}: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams);

  const validMessage = await validateActionSignature(
    previousFrame.postBody,
    DEBUG_HUB_OPTIONS
  );

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  // then, when done, return next frame
  return (
    <div>
      Starter kit with custom redirects in the /frames handler.{" "}
      <Link href="/debug">Debug</Link>
      <FrameContainer
        postUrl="/frames"
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage src="https://framesjs.org/og.png" />
        {/* <FrameImage
          src={`data:image/svg+xml,${encodeURIComponent(imageSvg)}`}
        /> */}
        <FrameInput text="put some text here" />
        <FrameButton onClick={dispatch}>
          {state?.active === "1" ? "Active" : "Inactive"}
        </FrameButton>
        <FrameButton onClick={dispatch}>
          {state?.active === "2" ? "Active" : "Inactive"}
        </FrameButton>
        <FrameButton href={`http://localhost:3000/`}>Page link</FrameButton>
        <FrameButton redirect>External</FrameButton>
      </FrameContainer>
    </div>
  );
}
