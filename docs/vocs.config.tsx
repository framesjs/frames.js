import { defineConfig } from "vocs";

const sidebar = [
  {
    text: "Introduction",
    link: "/",
  },
  {
    text: "Reference",
    // link: "/reference",
    collapsed: false,
    items: [
      {
        text: "frames.js",
        collapsed: false,
        items: [
          {
            text: "types",
            link: "/reference/js/types",
          },
          {
            text: "getAddressForFid",
            link: "/reference/js/getAddressForFid",
          },
          {
            text: "getFrame",
            link: "/reference/js/getFrame",
          },
          {
            text: "getFrameFlattened",
            link: "/reference/js/getFrameFlattened",
          },
          {
            text: "getFrameHtml",
            link: "/reference/js/getFrameHtml",
          },
          {
            text: "validateFrameMessage",
            link: "/reference/js/validateFrameMessage",
          },
        ],
      },
      {
        text: "frames.js/next/server",
        collapsed: false,
        items: [
          {
            text: "getPreviousFrame",
            link: "/reference/nextjs/getPreviousFrame",
          },
          {
            text: "POST",
            link: "/reference/nextjs/POST",
          },
        ],
      },
      {
        text: "frames.js/next/server - [react]",
        collapsed: false,
        items: [
          {
            text: "types",
            link: "/reference/react/types",
          },
          {
            text: "FrameContainer",
            link: "/reference/react/FrameContainer",
          },
          {
            text: "FrameButton",
            link: "/reference/react/FrameButton",
          },
          {
            text: "FrameImage",
            link: "/reference/react/FrameImage",
          },
          {
            text: "FrameInput",
            link: "/reference/react/FrameInput",
          },
          {
            text: "parseFrameParams",
            link: "/reference/react/parseFrameParams",
          },
          {
            text: "useFramesReducer",
            link: "/reference/react/useFramesReducer",
          },
          {
            text: "validateActionSignature",
            link: "/reference/react/validateActionSignature",
          },
          {
            text: "createPreviousFrame",
            link: "/reference/react/createPreviousFrame",
          },
        ],
      },
    ],
  },
];

export default defineConfig({
  ogImageUrl: "https://framesjs.org/og.png",
  title: "frames.js",
  logoUrl: { light: "/logo.png", dark: "/logo.png" },
  iconUrl: "/favicons/favicon.svg",
  rootDir: ".",
  head: (
    <>
      {/** on production is rewritten by vercel */}
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
  sidebar: sidebar,
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
