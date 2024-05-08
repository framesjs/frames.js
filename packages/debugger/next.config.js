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
  webpack: (config) => {
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
