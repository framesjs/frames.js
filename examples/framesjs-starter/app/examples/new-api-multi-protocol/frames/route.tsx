/* eslint-disable react/jsx-key */
import { createFrames, Button } from "frames.js/next";
import { openframes, farcasterHubContext } from "frames.js/middleware";
import { getXmtpFrameMessage, isXmtpFrameActionPayload } from "frames.js/xmtp";
import { DEFAULT_DEBUGGER_HUB_URL } from "../../../debug";

export const frames = createFrames({
  basePath: "/examples/new-api-multi-protocol",
  initialState: {
    pageIndex: 0,
  },
  middleware: [
    farcasterHubContext({
      hubHttpUrl: DEFAULT_DEBUGGER_HUB_URL,
    }),
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
  return {
    image: (
      <div tw="flex flex-col">
        <div tw="flex">Click the button</div>
      </div>
    ),
    buttons: [
      <Button action="post" target="/who-am-i">
        Who am I?
      </Button>,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
