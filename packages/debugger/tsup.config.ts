import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
  dts: true,
  format: ["cjs", "esm"],
  // external: ["@xmtp/xmtp-js", "wagmi", "@rainbowkit"],
  external: [
    ...Object.keys(pkg.devDependencies),
    ...Object.keys(pkg.dependencies),
  ],
  clean: true,
  entry: {
    "hooks/index": "./app/hooks/index.ts",
  },
});