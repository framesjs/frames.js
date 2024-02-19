import { FrameImage } from "frames.js/next/server";
import { RouterAppState } from "../types";
import { Frame, FrameLink, frames } from "../api";

export default function CheckValueFrame() {
  const frame = frames<RouterAppState>();
  const textInputValue = frame.previousFrame?.postBody?.untrustedData.inputText;

  if (!textInputValue) {
    return (
      <Frame>
        <FrameImage>
          <div>You did not provide any value</div>
        </FrameImage>
        <FrameLink
          to={(state: RouterAppState) => ({
            path: "/",
            state: { ...state, answersCount: 0 },
          })}
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
        <FrameLink
          to={(state: RouterAppState) => ({
            path: "/",
            state: { ...state, answersCount: 0 },
          })}
        >
          Reset
        </FrameLink>
      )}
    </Frame>
  );
}
