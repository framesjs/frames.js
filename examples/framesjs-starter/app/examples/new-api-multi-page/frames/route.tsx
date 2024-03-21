/* eslint-disable react/jsx-key */
import { Button } from "@frames.js/next";
import { createFrames } from "@frames.js/next";

const totalPages = 5;

export const frames = createFrames({
  basePath: "/examples/new-api/frames",
  initialState: {
    pageIndex: 0,
  },
});

const handleRequest = frames(async ({ clickedButton, message, state }) => {
  const imageUrl = `https://picsum.photos/seed/frames.js-${state.pageIndex}/1146/600`;

  return {
    image: (
      <div tw="flex flex-col">
        <img width={573} height={300} src={imageUrl} alt="Image" />
        <div tw="flex">
          This is slide {message?.state?.pageIndex + 1} / {totalPages}
        </div>
      </div>
    ),
    buttons: [
      <Button
        action="post"
        state={{ pageIndex: (state?.pageIndex - 1) % totalPages }}
      >
        ←
      </Button>,
      <Button
        action="post"
        state={{ pageIndex: (state?.pageIndex + 1) % totalPages }}
      >
        →
      </Button>,
    ],
    textInput: "Type something!",
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
