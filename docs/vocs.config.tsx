import { defineConfig } from "vocs";

export default defineConfig({
  ogImageUrl: "https://framesjs.org/og.png",
  title: "frames.js",
  head: (
    <>
      <script defer src="/_vercel/insights/script.js" />
      <meta property="og:type" content="website" />
    </>
  ),
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
