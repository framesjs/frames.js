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
            text: "getFrameMessage",
            link: "/reference/js/getFrameMessage",
          },
          {
            text: "getUserDataForFid",
            link: "/reference/js/getUserDataForFid",
          },
          {
            text: "validateFrameMessage",
            link: "/reference/js/validateFrameMessage",
          },
          {
            text: "XMTP",
            collapsed: false,
            items: [
              {
                text: "Tutorial",
                link: "/reference/js/xmtp",
              },
              {
                text: "getXmtpFrameMessage",
                link: "/reference/js/xmtp/getXmtpFrameMessage",
              },
              {
                text: "isXmtpFrameActionPayload",
                link: "/reference/js/xmtp/isXmtpFrameActionPayload",
              },
            ],
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
  logoUrl: { light: "/full-logo.png", dark: "/full-logo.png" },
  iconUrl: "/favicons/favicon.svg",
  rootDir: ".",
  head: (
    <>
      {/** on production this is rewritten by vercel */}
      <script defer src="/_vercel/insights/script.js" />
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
