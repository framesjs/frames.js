# @frames.js/express

Build your frames.js app using [Express.js](https://expressjs.com).

## Installation

```sh
$ npm install @frames.js/express
$ yarn add @frames.js/express
$ pnpm add @frames.js/express
```

## Usage

### Build your first Frames

```tsx
// app/routes/frames.tsx
import { createFrames, Button } from "@frames.js/express";
import express from "express";

const app = express();

const frames = createFrames();
const framesRouteHandler = frames(async (ctx) => {
  const didClickButton = !!ctx.pressedButton;

  return {
    image: (
      <span>
        {didClickButton ? "You clicked the button" : "Click the button"}
      </span>
    ),
    buttons: [<Button action="post">Click me</Button>],
  };
});

app.use("/frames", framesRouteHandler);
```
