/* eslint-disable react/jsx-key */
import { farcasterHubContext, openframes } from "frames.js/middleware";
import { imagesWorkerMiddleware } from "frames.js/middleware/images-worker";
import { createFrames } from "frames.js/next";
import { getXmtpFrameMessage, isXmtpFrameActionPayload } from "frames.js/xmtp";
import { DEFAULT_DEBUGGER_HUB_URL } from "../../../debug";
import { appURL } from "../../../utils";
import { getLensFrameMessage, isLensFrameActionPayload } from "frames.js/lens";

export const frames = createFrames({
  basePath: "/examples/multi-protocol/frames",
  baseUrl: appURL(),
  debug: process.env.NODE_ENV === "development",
  initialState: {
    pageIndex: 0,
  },
  middleware: [
    imagesWorkerMiddleware({
      imagesRoute: "/images",
    }),
    farcasterHubContext({
      hubHttpUrl: DEFAULT_DEBUGGER_HUB_URL,
    }),
    openframes({
      clientProtocol: {
        id: "xmtp",
        version: "2024-02-09",
      },
      handler: {
        isValidPayload: (body) => isXmtpFrameActionPayload(body),
        getFrameMessage: async (body) => {
          if (!isXmtpFrameActionPayload(body)) {
            return undefined;
          }
          const result = await getXmtpFrameMessage(body);

          return { ...result };
        },
      },
    }),
    openframes({
      clientProtocol: {
        id: "lens",
        version: "1.0.0",
      },
      handler: {
        isValidPayload: (body) => isLensFrameActionPayload(body),
        getFrameMessage: async (body) => {
          if (!isLensFrameActionPayload(body)) {
            return undefined;
          }
          const result = await getLensFrameMessage(body);

          return { ...result };
        },
      },
    }),
    openframes(), // enables anonymous access
  ],
});
