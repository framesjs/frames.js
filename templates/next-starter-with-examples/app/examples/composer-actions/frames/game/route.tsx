/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "../frames";

const gameFrameHandler = frames(async (ctx) => {
  const number = parseInt(ctx.searchParams.number ?? "", 10);

  if (!Number.isInteger(number) || number < 0 || number > 9) {
    return {
      image: <div tw="flex">Game is in invalid state</div>,
      title: "Guess the number game",
    };
  }

  let state: "initial" | "invalid-attempt" | "invalid-input" = "initial";

  if (ctx.message) {
    const answer = parseInt(ctx.message.inputText ?? "", 10);

    if (Number.isInteger(answer)) {
      if (answer === number) {
        return {
          title: "Guess the number game",
          image: <div tw="flex">You guessed the number!</div>,
          buttons: [
            <Button
              action="post"
              target={{
                pathname: "/game",
                query: ctx.searchParams,
              }}
            >
              Go back
            </Button>,
          ],
        };
      } else {
        state = "invalid-attempt";
      }
    } else {
      state = "invalid-input";
    }
  }

  return {
    image:
      state === "initial" || state === "invalid-input" ? (
        <div tw="flex">Guess the number</div>
      ) : (
        <div tw="flex">Try again</div>
      ),
    textInput: "Enter a number from 0 to 9",
    buttons: [
      <Button
        action="post"
        target={{
          pathname: "/game",
          query: ctx.searchParams,
        }}
      >
        Check
      </Button>,
    ],
    title: "Guess the number game",
  };
});

export const GET = gameFrameHandler;
export const POST = gameFrameHandler;
