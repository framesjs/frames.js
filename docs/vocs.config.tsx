import { defineConfig } from "vocs";

export default defineConfig({
  ogImageUrl: "https://framesjs.org/og.png",
  title: "frames.js",
  head: (
    <>
      <script defer src="/_vercel/insights/script.js" />
      <meta property="og:type" content="website" />
      <meta name="fc:frame" content="vNext" />
      <meta
        name="fc:frame:post_url"
        content="https://framesjs-homeframe.vercel.app/frames?p=&amp;s=%7B%22page%22%3A1%7D&amp;r=%7B%7D"
      />
      <meta name="fc:frame:image" content="http://framesjs.org/og.png" />
      <meta property="og:image" content="http://framesjs.org/og.png" />
      <meta name="fc:frame:button:1" content="→" />
      <meta name="fc:frame:button:1:action" content="post" />
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
