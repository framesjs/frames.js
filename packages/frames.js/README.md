# frames.js

frames.js is a TypeScript library and framework for writing and testing Farcaster Frames.

<p align="center"><a href="https://framesjs.org"><img width="1000" title="Frames.js" src='https://framesjs.org/og.png' /></a></p>

## Features

- ⚡️ Local frames debugger
- 🥳 Write Frames using React
- 🔋 Batteries included framework
- 🌴 Tree-shakeable & Lightweight
- 🚀 Library with all the functions

## Documentation

[Look at our documentation](https://framesjs.org) to learn more about frames.js.

## Installation

```bash
npm install frames.js
```

```bash
yarn add frames.js
```

## Quick Start

### Clone the frames.js starter template (with local debugger)

Run to clone the starter into a new folder called `framesjs-starter`

```bash
npx degit github:framesjs/frames.js/examples/framesjs-starter#main framesjs-starter
```

or [clone from github](https://github.com/framesjs/frames.js/tree/main/examples/framesjs-starter)



## Alternatively, add frames.js to your existing project manually


### 1. Add `frames.js` to your project

```sh
yarn add frames.js
```

### 2. Create your Frames app

Create a `frames` directory in your Next.js app and add the following files:

#### `./app/frames/frames.ts`
```tsx [./app/frames/frames.ts]
import { createFrames } from "frames.js/next";

export const frames = createFrames({
  basePath: "/frames",
});
```

### 3. Create a Frames route

#### `./app/frames/route.tsx`
```tsx [./app/frames/route.tsx]
/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";

const handleRequest = frames(async (ctx) => {
  return {
    image: (
      <span>
        {ctx.pressedButton
          ? `I clicked ${ctx.searchParams.value}`
          : `Click some button`}
      </span>
    ),
    buttons: [
      <Button action="post" target={{ query: { value: "Yes" } }}>
        Say Yes
      </Button>,
      <Button action="post" target={{ query: { value: "No" } }}>
        Say No
      </Button>,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
```

### 4. Include Frames alongside your existing page's metadata

```tsx [./app/page.tsx]
import { fetchMetadata } from "frames.js/next";

export async function generateMetadata() {
  return {
    title: "My Page",
    // ...
    other: {
      // ...
      ...(await fetchMetadata(
        // provide a full URL to your /frames endpoint
        new URL(
          "/frames",
          process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000"
        )
      )),
    },
  };
}

export default function Page() {
  return <span>My existing page</span>;
}
```

### 5. Done! 🎉

![](/frames/frame2.png)

[Debugging your Frames locally](/guides/debugger)

## Prefer not to use a Framework?

### You can use frames.js library helper functions instead

```tsx filename="./app/page.tsx"
// page that renders a frame
// ./app/page.tsx

import { Frame, getFrameFlattened } from "frames.js";
import type { Metadata } from "next";

// Declare the frame
const initialFrame: Frame = {
  image: "https://picsum.photos/seed/frames.js/1146/600",
  version: "vNext",
  buttons: [
    {
      label: "Random image",
    },
  ],
  postUrl: `${process.env.NEXT_PUBLIC_HOST}/frames`,
};

// Export Next.js metadata
export const metadata: Metadata = {
  title: "Random Image Frame",
  description: "This is an example of a simple frame using frames.js",
  openGraph: {
    images: [
      {
        url: "https://picsum.photos/seed/frames.js/600",
      },
    ],
  },
  other: getFrameFlattened(initialFrame),
};
```

```ts filename="app/frames/route.ts"
// handle frame actions
// ./app/frames/route.ts

import { getFrameHtml, validateFrameMessage } from "frames.js";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Parse and validate the frame message
  const { isValid, message } = await validateFrameMessage(body);
  if (!isValid || !message) {
    return new Response("Invalid message", { status: 400 });
  }

  const randomInt = Math.floor(Math.random() * 100);
  const imageUrlBase = `https://picsum.photos/seed/${randomInt}`;

  // Use the frame message to build the frame
  const frame = {
    version: "vNext",
    image: `${imageUrlBase}/1146/600`,
    buttons: [
      {
        label: `Next (pressed by ${message.data.fid})`,
      },
    ],
    ogImage: `${imageUrlBase}/600`,
    postUrl: `${process.env.NEXT_PUBLIC_HOST}/frames`,
  };

  // Return the frame as HTML
  const html = getFrameHtml(frame);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
    },
    status: 200,
  });
}
```

## License

Distributed under an MIT License. See [LICENSE](./LICENSE) for more information.

## Community

Check out the following places for more Frames-related content:

- Join the [/frames-dev](https://warpcast.com/frames-dev) channel on Farcaster to ask questions
- Follow [Frames.js](https://warpcast.com/frames) & team ([@df](https://warpcast.com/df) and [@stephancill](https://warpcast.com/stephancill)) on Farcaster for updates
- Star [frames.js](https://github.com/framesjs/frames.js) on GitHub to show your support and keep track of updates
- Browse the [awesome-frames](https://github.com/davidfurlong/awesome-frames) list of awesome Frames projects and resources
