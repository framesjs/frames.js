# @frames.js/core

Core utilitirs to build Frames.js applications and integrations.

## Installation

```sh
$ npm install @frames.js/core
$ yarn add @frames.js/core
$ pnpm add @frames.js/core
```

## Usage

### Build your first Frames

```tsx
import { createFrames, Button } from "@frames.js/core";

const app = new Hono();

const frames = createFrames();
const handleRequest = frames(async (ctx) => {
  const didClickButton = !!ctx.clickedButton;

  return {
    image: (
      <span>
        {didClickButton ? "You clicked the button" : "Click the button"}
      </span>
    ),
    buttons: [<Button action="post">Click me</Button>],
  };
});

// returns Promise<Response>
handleRequest(new Request('http://localhost:3000));
```
