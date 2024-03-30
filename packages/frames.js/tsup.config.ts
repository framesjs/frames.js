import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";
import glob from "fast-glob";

export default defineConfig({
  // this is necessary for cloudfare workers adapter to be able to import
  // buffer from cloudflare compatiblity layer
  external: ["node:buffer"],
  dts: true,
  format: ["cjs", "esm"],
  clean: true,
  entry: glob.sync("src/**/*.{ts,tsx}", {
    ignore: ["**/*.test.{ts,tsx}", "**/*.snap", "**/test.types.{ts,tsx}"],
    onlyFiles: true,
    cwd: dirname(fileURLToPath(import.meta.url)),
  }),
});
