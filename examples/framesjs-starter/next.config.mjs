/** @type {import('next').NextConfig} */
const nextConfig = {
  // prevent double render on dev mode, which causes 2 frames to exist
  reactStrictMode: false,
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
    if (!isServer) {
      config.resolve.fallback.fs = false;
    }
    return config;
  },
};

export default nextConfig;
