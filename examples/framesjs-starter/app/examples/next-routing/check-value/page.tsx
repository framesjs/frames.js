import { FrameImage } from "frames.js/next/server";
import { FrameLink, FramePageProps, createFramePage } from "../components";
import { RouterAppState, initialState } from "../types";

function CheckValueFrame({ frame, Frame }: FramePageProps<RouterAppState>) {
  const textInputValue = frame.previousFrame?.postBody?.untrustedData.inputText;

  if (!textInputValue) {
    return (
      <Frame>
        <FrameImage>
          <div>You did not provide any value</div>
        </FrameImage>
        <FrameLink<RouterAppState>
          to={(state) => ({ path: "/", state: { ...state, answersCount: 0 } })}
        >
          Reset
        </FrameLink>
      </Frame>
    );
  }

  const val = parseInt(textInputValue, 10);
  const isCorrectAnswer = val === frame.state.correctAnswer;

  return (
    <Frame>
      <FrameImage>
        <div tw="flex flex-col">
          <div tw="flex">
            {isCorrectAnswer ? "You are the 💣" : "😢 wrong answer"}
          </div>
          <div tw="flex">This is answer #{frame.state.answersCount}</div>
        </div>
      </FrameImage>
      {!isCorrectAnswer ? (
        <FrameLink to="/enter-value">Try again</FrameLink>
      ) : (
        <FrameLink<RouterAppState>
          to={(state) => ({ path: "/", state: { ...state, answersCount: 0 } })}
        >
          Reset
        </FrameLink>
      )}
    </Frame>
  );
}

export default createFramePage<RouterAppState>(
  {
    initialState,
    framesHandlerURL: "/examples/next-routing/frames",
    framesURL: "/examples/next-routing",
  },
  CheckValueFrame
);
