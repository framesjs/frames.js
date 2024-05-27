import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import MonacoEditorWebpackPlugin from "monaco-editor-webpack-plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "*",
        protocol: "http",
      },
      {
        hostname: "*",
        protocol: "https",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // replace @vercel/og by stub module so we can compile frames.js for browser
    if (!isServer) {
      config.resolve.alias["@vercel/og$"] = resolve(
        dirname(fileURLToPath(import.meta.url)),
        "./stub-modules/@vercel/og/index.js"
      );

      config.plugins.push(
        new MonacoEditorWebpackPlugin({
          languages: ["typescript"],
          filename: "static/[name].worker.js",
        })
      );

      // load monaco-editor provided ttf fonts
      config.module.rules.push({ test: /\.ttf$/, type: "asset/resource" });
    }

    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      // this is installed by `@xmtp/xmtp-js` and used internally, we have to mark it as external
      // because it breaks nextjs server side build. Also because of that `@xmtp/xmtp-js` must be in `dependencies`
      // so it is installed on user's system
      "@xmtp/user-preferences-bindings-wasm"
    );
    return config;
  },
};

export default nextConfig;
