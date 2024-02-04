<p align="center"><a href="https://framesjs.org"><img width="1000" title="Frames.js" src='https://framesjs.org/og.png' /></a></p>

# frames.js

frames.js is a TypeScript library and framework for writing and testing Farcaster Frames.

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

## Start with frames.js in Next.js in two copy-pastes

```tsx filename="// ./app/page.tsx"
// ./app/page.tsx

import {
  FrameContainer,
  FrameImage,
  FrameButton,
  useFramesReducer,
  getPreviousFrame,
  validateActionSignature,
  FrameInput,
} from "frames.js/next/server";

const reducer = (state, action) => ({ count: state.count + 1 });

export default async function Home(props) {
  const previousFrame = getPreviousFrame(props.searchParams);
  await validateActionSignature(previousFrame.postBody);
  const [state, dispatch] = useFramesReducer(
    reducer,
    { count: 0 },
    previousFrame
  );

  return (
    <FrameContainer
      postUrl="/frames"
      state={state}
      previousFrame={previousFrame}
    >
      <FrameImage src="https://picsum.photos/seed/frames.js/1146/600" />
      <FrameButton onClick={dispatch}>{state.count}</FrameButton>
    </FrameContainer>
  );
}
```

```ts filename="./app/frames/route.ts"
// ./app/frames/route.ts

export { POST } from "frames.js/next/server";
```

## Alternatively, [Fork our boilerplate](https://github.com/framesjs/frames.js/tree/main/examples/framesjs-starter) that includes local debugging

## Local fully interactive Debugger & Frame validation

![](/debugging.png)

Or use the [hosted Frames debugger](https://debugger.framesjs.org/debug). Running locally has the benefits of it working with localhost.

## Prefer to not use JSX?

### Use frames.js in Next.js using helper functions

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
