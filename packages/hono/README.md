# @frames.js/hono

Build your frames.js app using [Hono](https://hono.dev).

## Installation

```sh
$ npm install @frames.js/hono
$ yarn add @frames.js/hono
$ pnpm add @frames.js/hono
```

## Usage

### Build your first Frames

```tsx
import { createFrames, Button } from "@frames.js/hono";
import { Hono } from "hono";

const app = new Hono();

const frames = createFrames();
const framesRouteHandler = frames(async (ctx) => {
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

app.on(["GET", "POST"], "/", framesRouteHandler);
```
