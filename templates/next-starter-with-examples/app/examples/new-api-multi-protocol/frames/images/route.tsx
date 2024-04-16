import { createImagesWorker } from "frames.js/middleware/images-worker/next";

const imagesWorker = createImagesWorker();

export const GET = imagesWorker();
