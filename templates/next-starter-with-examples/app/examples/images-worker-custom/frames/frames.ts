import { imagesWorkerMiddleware } from "frames.js/middleware/images-worker";
import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/images-worker-custom",
  baseUrl: appURL(),
  middleware: [
    imagesWorkerMiddleware({
      imagesRoute: "/images",
      secret: "MY_SECRET",
    }),
  ],
  debug: process.env.NODE_ENV === "development",
});
