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

import { FrameContainer, FrameImage, FrameButton, useFramesReducer, getPreviousFrame, validateActionSignature, FrameInput } from "frames.js/next/server";

const reducer = (state, action) => ({ count: state.count + 1 });

export default async function Home(props) {
  const previousFrame = getPreviousFrame(props.searchParams);
  await validateActionSignature(previousFrame.postBody);
  const [state, dispatch] = useFramesReducer(reducer, { count: 0 }, previousFrame);

  return (
    <FrameContainer postUrl="/frames" state={state} previousFrame={previousFrame}>
      <FrameImage src="https://picsum.photos/seed/frames.js/1146/600" />
      <FrameButton onClick={dispatch}>
        {state.count}
      </FrameButton>
    </FrameContainer>
  );
}

```

```ts filename="./app/frames/route.ts"
// ./app/frames/route.ts

export { POST } from "frames.js/next/server";
```

## License

Distributed under an MIT License. See [LICENSE](./LICENSE) for more information.

## Community

Check out the following places for more Frames-related content:

- Join the [/frames-dev](https://warpcast.com/frames-dev) channel on Farcaster to ask questions
- Follow [Frames.js](https://warpcast.com/frames) & team ([@df](https://warpcast.com/df) and [@stephancill](https://warpcast.com/stephancill)) on Farcaster for updates
- Star [frames.js](https://github.com/framesjs/frames.js) on GitHub to show your support and keep track of updates
- Browse the [awesome-frames](https://github.com/davidfurlong/awesome-frames) list of awesome Frames projects and resources
