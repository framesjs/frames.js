import { imagesWorkerMiddleware } from "frames.js/middleware/images-worker";
import { createFrames } from "frames.js/next";

export const frames = createFrames({
  basePath: "/examples/new-api-image-worker",
  middleware: [
    imagesWorkerMiddleware({
      imagesRoute: "/image-worker",
    }),
  ],
});
