/* eslint-disable react/jsx-key */
import { createFrames, Button } from "frames.js/next";
import { openframes } from "frames.js/middleware";
import { defaultMiddleware } from "frames.js/core";
import { getXmtpFrameMessage, isXmtpFrameActionPayload } from "frames.js/xmtp";

const totalPages = 5;

export const frames = createFrames({
  basePath: "/examples/new-api/frames",
  initialState: {
    pageIndex: 0,
  },
  middleware: [
    ...defaultMiddleware,
    openframes({
      clientProtocol: {
        id: "xmtp",
        version: "2024-02-09",
      },
      handler: {
        isValidPayload: (body: JSON) => isXmtpFrameActionPayload(body),
        getFrameMessage: async (body: JSON) => {
          if (!isXmtpFrameActionPayload(body)) {
            return undefined;
          }
          const result = await getXmtpFrameMessage(body);

          return { ...result };
        },
      },
    }),
  ],
});

const handleRequest = frames(async (ctx) => {
  const imageUrl = `https://picsum.photos/seed/frames.js-${ctx.state.pageIndex}/300/200`;

  return {
    image: (
      <div tw="flex flex-col">
        <img width={300} height={200} src={imageUrl} alt="Image" />
        <div tw="flex">
          This is slide {ctx.state.pageIndex + 1} / {totalPages}
        </div>
      </div>
    ),
    buttons: [
      <Button
        action="post"
        state={{ pageIndex: (ctx.state.pageIndex - 1) % totalPages }}
      >
        ←
      </Button>,
      <Button
        action="post"
        state={{ pageIndex: (ctx.state.pageIndex + 1) % totalPages }}
      >
        →
      </Button>,
    ],
    textInput: "Type something!",
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
