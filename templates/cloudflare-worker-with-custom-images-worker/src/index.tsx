import { createFrames, Button } from "frames.js/cloudflare-workers";
import { imagesWorkerMiddleware } from "frames.js/middleware/images-worker";
import { createImagesWorker } from "frames.js/middleware/images-worker/next";
import type { JsonValue } from "frames.js/types";

const IMAGES_SECRET_KEY = "my-super-secret-key";

const createImagesWorkerHandler = createImagesWorker({
  secret: IMAGES_SECRET_KEY,
});

const imagesWorkerHandler = createImagesWorkerHandler();

type Env = {
  /**
   * Taken from wrangler.toml#vars
   */
  MY_APP_LABEL: string;
};

const frames = createFrames<JsonValue | undefined, Env>({
  middleware: [
    imagesWorkerMiddleware({
      imagesRoute: "/images",
      secret: IMAGES_SECRET_KEY,
    }),
  ],
});

const handleFrameRequest = frames(async (ctx) => {
  const hasClicked = !!(ctx.message && ctx.searchParams.clicked);

  return {
    image: (
      <span>
        {ctx.cf.env.MY_APP_LABEL} {hasClicked ? "Yes" : "No"}
      </span>
    ),
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
  };
});

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    if (url.pathname === "/images") {
      return imagesWorkerHandler(req);
    }

    return handleFrameRequest(req, env, ctx);
  },
} satisfies ExportedHandler<Env>;
