import { createFrames, Button } from "frames.js/cloudflare-workers";
import { imagesWorkerMiddleware } from "frames.js/middleware/images-worker";
import { IMAGES_WORKER_ROUTE, IMAGES_WORKER_SECRET } from "./constants";

const frames = createFrames({
  middleware: [
    imagesWorkerMiddleware({
      imagesRoute: IMAGES_WORKER_ROUTE,
      secret: IMAGES_WORKER_SECRET,
    }),
  ],
});

export const handleFramesRequest = frames(async (ctx) => {
  const hasClicked = !!(ctx.message && ctx.searchParams.clicked);
  
  return {
    image: <span>Hello, World!</span>,
    buttons: !hasClicked
    ? [
        <Button action="post" target={{ query: { clicked: true } }}>
          Click Me
        </Button>,
      ]
    : [
        <Button action="post" target="/">
          Reset
        </Button>,
      ],
  }
});