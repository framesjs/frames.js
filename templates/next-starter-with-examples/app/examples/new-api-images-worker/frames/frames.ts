import { imagesWorkerMiddleware } from "frames.js/middleware/images-worker";
import { createFrames } from "frames.js/next";

export const frames = createFrames({
  basePath: "/examples/new-api-images-worker",
  middleware: [
    imagesWorkerMiddleware({
      imagesRoute: "/images",
      secret: "SOME_SECRET_VALUE",
    }),
  ],
});
