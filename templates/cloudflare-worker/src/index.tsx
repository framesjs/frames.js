import { createFrames, Button } from "frames.js/cloudflare-workers";
import type { JsonValue } from "frames.js/types";

type Env = {
  /**
   * Taken from wrangler.toml#vars
   */
  MY_APP_LABEL: string;
};

const frames = createFrames<JsonValue | undefined, Env>();

const fetch = frames(async (ctx) => {
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
  fetch,
} satisfies ExportedHandler<Env>;
