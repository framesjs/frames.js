import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";
import glob from "fast-glob";

export default defineConfig({
  dts: true,
  format: ["cjs", "esm"],
  clean: true,
  entry: glob.sync("src/**/*.{ts,tsx}", {
    ignore: ["**/*.test.{ts,tsx}", "**/*.snap"],
    onlyFiles: true,
    cwd: dirname(fileURLToPath(import.meta.url)),
  }),
});
