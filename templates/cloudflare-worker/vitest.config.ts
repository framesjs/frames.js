// Following doesn't work because it is broken on some import. @see https://github.com/cloudflare/workers-sdk/issues/5367

/* import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
  },
});
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
});
