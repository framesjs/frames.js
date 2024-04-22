import { imagesWorkerMiddleware } from "frames.js/middleware/images-worker";
import { createFrames } from "frames.js/next";
import { appURL } from "../../../utils";

export const frames = createFrames({
  basePath: "/examples/new-api-images-worker",
  baseUrl: appURL(),
  middleware: [
    imagesWorkerMiddleware({
      imagesRoute: "/images",
      secret: "SOME_SECRET_VALUE",
    }),
  ],
});
