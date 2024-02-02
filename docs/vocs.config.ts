import { defineConfig } from "vocs";

export default defineConfig({
  ogImageUrl:
    "https://vocs.dev/api/og?logo=%logo&title=%title&description=%description",
  title: "frames.js",
  topNav: [
    { text: "Github", link: "https://github.com/framesjs/frames.js" },
    // {
    //   text: version,
    //   items: [
    //     {
    //       text: "Changelog",
    //       link: "https://github.com/wevm/vocs/blob/main/src/CHANGELOG.md",
    //     },
    //     {
    //       text: "Contributing",
    //       link: "https://github.com/wevm/vocs/blob/main/.github/CONTRIBUTING.md",
    //     },
    //   ],
    // },
  ],
});
