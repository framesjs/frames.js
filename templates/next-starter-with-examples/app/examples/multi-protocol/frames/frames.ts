/* eslint-disable react/jsx-key */
import { farcasterHubContext, openframes } from "frames.js/middleware";
import { imagesWorkerMiddleware } from "frames.js/middleware/images-worker";
import { createFrames } from "frames.js/next";
import { getXmtpFrameMessage, isXmtpFrameActionPayload } from "frames.js/xmtp";
import { DEFAULT_DEBUGGER_HUB_URL } from "../../../debug";
import { appURL } from "../../../utils";
import { getLensFrameMessage, isLensFrameActionPayload } from "frames.js/lens";
import {
  getEthereumFrameMessage,
  isEthereumFrameActionPayload,
} from "frames.js/ethereum";

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
    openframes({
      clientProtocol: {
        id: "eth",
        version: "v1",
      },
      handler: {
        isValidPayload: (body) => isEthereumFrameActionPayload(body),
        getFrameMessage: async (body) => {
          if (!isEthereumFrameActionPayload(body)) {
            return undefined;
          }
          const result = await getEthereumFrameMessage(body);

          let state: (typeof result)["state"] | undefined;

          if (result.state) {
            try {
              state = JSON.parse(result.state) as typeof state;
            } catch (error) {
              console.error("openframes: Could not parse state");
            }
          }

          return { ...result, state };
        },
      },
    }),
  ],
});
