import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // 1 second of cache time for images by default, this allows you to have dynamic images without cache busting
    minimumCacheTTL: 1,
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
