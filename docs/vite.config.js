import path from "path";

const viteConfig = {
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./docs"),
    },
  },
};

export default viteConfig;
