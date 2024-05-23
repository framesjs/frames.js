import { createImagesWorker } from "frames.js/middleware/images-worker/next";

const imagesRoute = createImagesWorker({
  secret: "SOME_SECRET_VALUE",
});

export const GET = imagesRoute();
