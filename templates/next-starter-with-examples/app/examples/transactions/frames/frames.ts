import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";
import { openframes } from "frames.js/middleware";
import { getXmtpFrameMessage, isXmtpFrameActionPayload } from "frames.js/xmtp";
import { getLensFrameMessage, isLensFrameActionPayload } from "frames.js/lens";

export const frames = createFrames({
  basePath: "/examples/transactions/frames",
  baseUrl: appURL(),
  debug: process.env.NODE_ENV === "development",
  middleware: [
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
    openframes(), // anonymous
  ],
});
