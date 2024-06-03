import { createImagesWorker } from "frames.js/middleware/images-worker/next";
import path from "path";
import { readFileSync } from "fs";

const interRegular = readFileSync(
  path.join(path.resolve(process.cwd(), "public"), "Inter-Regular.ttf")
);

const interBoldFont = readFileSync(
  path.join(path.resolve(process.cwd(), "public"), "Inter-Bold.ttf")
);

const imagesRoute = createImagesWorker({
  secret: "SOME_SECRET_VALUE",
  imageOptions: {
    fonts: [
      {
        name: "Inter",
        data: interRegular,
        weight: 400,
      },
      {
        name: "Inter",
        data: interBoldFont,
        weight: 700,
      },
    ],
  },
});

export const GET = imagesRoute();
