import { defineConfig } from "vocs";
import pkg from "../packages/frames.js/package.json";

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
        text: "Create a Frame",
        link: "/guides/create-frame",
      },
      {
        text: "Debugging",
        link: "/guides/debugger",
      },
      {
        text: "Multi-page Frames",
        link: "/guides/multiple-frames",
      },
      {
        text: "State Management",
        link: "/guides/state-management",
      },
      {
        text: "Deploying your Frame",
        link: "/guides/deployment",
      },
      {
        text: "Image Generation",
        link: "/guides/image-generation",
      },
      {
        text: "Performance",
        link: "/guides/performance",
      },
      {
        text: "Verifying Frame Actions",
        link: "/guides/security",
      },
      {
        text: "Caching",
        link: "/guides/caching",
      },
      {
        text: "Middleware",
        link: "/guides/middleware",
      },
      {
        text: "Transactions",
        link: "/guides/transactions",
      },
      {
        text: "Open Frames",
        link: "/guides/open-frames",
      },
    ],
  },
  {
    text: "Frames.js for Apps",
    collapsed: false,
    items: [
      {
        text: "Display Frames",
        link: "/guides/apps/display-frames",
      },
    ],
  },
  {
    text: "Write your frame with",
    collapsed: false,
    items: [
      {
        text: "Next.js",
        link: "/reference/core/next",
      },
      {
        text: "Express.js",
        link: "/reference/core/express",
      },
      {
        text: "Hono",
        link: "/reference/core/hono",
      },
      {
        text: "Remix",
        link: "/reference/core/remix",
      },
      {
        text: "Cloudflare Workers",
        link: "/reference/core/cloudflare-workers",
      },
    ],
  },
  {
    text: "Middleware",
    collapsed: false,
    items: [
      {
        text: "Farcaster Hub Context",
        link: "/middleware/farcasterHubContext",
      },
      {
        text: "Open Frames",
        link: "/middleware/openframes",
      },
    ],
  },
  {
    text: "Troubleshooting",
    link: "/troubleshooting",
  },
  {
    text: "Reference",
    // link: "/reference",
    collapsed: false,
    items: [
      {
        text: "frames.js/core",
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
          {
            text: "error",
            link: "/reference/core/error",
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
        text: "@frames.js/render",
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
          {
            text: "Next.js",
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
      {
        text: "Deprecated APIs",
        items: [
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
        ],
      },
    ],
  },
];

// eslint-disable-next-line import/no-default-export -- default export is required
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
    {
      text: pkg.version,
      items: [
        {
          text: `Migrating to ${toPatchVersionRange(pkg.version)}`,
          link: `/guides/migration-guide#_${toPatchVersionRange(
            pkg.version
          ).replace(/\./g, "-")}-breaking-changes`,
        },
        {
          text: "Changelog",
          link: "https://github.com/framesjs/frames.js/blob/main/packages/frames.js/CHANGELOG.md",
        },
        {
          text: "Contributing",
          link: "https://github.com/framesjs/frames.js/blob/main/.github/CONTRIBUTING.md",
        },
      ],
    },
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

function toPatchVersionRange(version: string) {
  const [major, minor] = version.split(".").slice(0, 2);
  return `${major}.${minor}.x`;
}
