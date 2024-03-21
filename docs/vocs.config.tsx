import { defineConfig } from "vocs";

const sidebar = [
  {
    text: "Introduction",
    link: "/",
  },
  {
    text: "Guides",
    collapsed: false,
    items: [
      {
        text: "Display Frames",
        link: "/guides/display-frames",
      },
    ],
  },
  {
    text: "Reference",
    // link: "/reference",
    collapsed: false,
    items: [
      {
        text: "@frames.js/express",
        link: "/reference/express",
      },
      {
        text: "@frames.js/hono",
        link: "/reference/hono",
      },
      {
        text: "@frames.js/next",
        link: "/reference/next",
      },
      {
        text: "@frames.js/remix",
        link: "/reference/remix",
      },
      {
        text: "@frames.js/core",
        collapsed: false,
        items: [
          {
            text: "createFrames",
            link: "/reference/core/createFrames",
          },
          {
            text: "Button",
            link: "/reference/core/Button",
          },
          {
            text: "redirect",
            link: "/reference/core/redirect",
          },
        ],
      },
      {
        text: "frames.js",
        collapsed: true,
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
        collapsed: true,
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
        collapsed: true,
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
      {
        text: "frames.js/render",
        collapsed: true,
        items: [
          {
            text: "useFrame",
            link: "/reference/render/use-frame",
          },
          {
            text: "types",
            link: "/reference/render/types",
          },
          {
            text: "FrameUI",
            link: "/reference/render/frame-ui",
          },
        ],
      },
      {
        text: "frames.js/render/next",
        collapsed: true,
        items: [
          {
            text: "FrameImage",
            link: "/reference/render/next/frame-image",
          },
          {
            text: "POST",
            link: "/reference/render/next/POST",
          },
          {
            text: "GET",
            link: "/reference/render/next/GET",
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
  head({ path }) {
    if (path === "/")
      return (
        <>
          {/** on production this is rewritten by vercel */}
          <meta property="og:type" content="website" />
          <meta name="fc:frame" content="vNext" />
          <meta
            name="fc:frame:post_url"
            content="https://framesjs-homeframe.vercel.app/frames?p=&amp;s=%7B%22page%22%3A1%7D&amp;r=%7B%7D"
          />
          <meta name="fc:frame:image" content="https://framesjs.org/og.png" />
          <meta property="og:image" content="https://framesjs.org/og.png" />
          <meta name="fc:frame:button:1" content="Open docs" />
          <meta
            name="fc:frame:button:1:target"
            content="https://framesjs.org"
          />
          <meta name="fc:frame:button:1:action" content="link" />
          <meta name="fc:frame:button:2" content="→" />
          <meta name="fc:frame:button:2:action" content="post" />
          <script defer src="/_vercel/insights/script.js" />
        </>
      );
    else
      return (
        <>
          <script defer src="/_vercel/insights/script.js" />
        </>
      );
  },
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
