import { createImagesWorkerRequestHandler } from "frames.js/middleware/images-worker/handler";
import { IMAGES_WORKER_SECRET } from "./constants";

export const handleImagesWorkerRequest = createImagesWorkerRequestHandler({
  secret: IMAGES_WORKER_SECRET,
});
