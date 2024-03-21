# @frames.js/next

Build your frames.js app using Next.js

## Installation

```sh
$ npm install @frames.js/next
$ yarn add @frames.js/next
$ pnpm add @frames.js/next
```

## Usage

### Build basic frames.js app.

### App Router

If you use Appp router you need to define a [route handler](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) which renders your Frames.

```jsx
// app/api/route.jsx
import { createFrames, Button } from "@frames.js/next";

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

export const GET = framesRouteHandler;
export const POST = framesRouteHandler;
```

#### Rendering Frames meta tags on existing Next.js page using App Router

If you use Next.js App Router and [metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata#dynamic-metadata) you can include your Frames meta tags using `fetchMetaData()` function.

```jsx
// app/page.jsx
import { fetchMetadata } from "@frames.js/next";

export async function generateMetadata() {
  // you must provide full URL to your Frames app so we can fetch meta tags
  const framesMetaTags = await fetchMetadata(
    new URL("/api", process.env.VERCEL_URL || "http://localhost:3000")
  );

  return {
    title: "My Title",
    other: {
      ...framesMetaTags,
    },
  };
}
```

### Pages Routes

If you use Pages router you need to define an [API route](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) which renders your Frames.

```jsx
// pages/api/index.js
import { createFrames, Button } from "@frames.js/next/pages-router";

const frames = createFrames({
  basePath: "/api",
});
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

export default framesRouteHandler;
```

#### Rendering Frames meta tags on existing Next.js page using Pages Router

If you use Next.js Pages Router you can include your Frames meta tags using `fetchMetadata()` and `metadataToMetaTags()` functions.

```jsx
// pages/index.jsx
import {
  fetchmMetadata,
  metadataToMetaTags,
} from "@frames.js/next/pages-router";
import Head from "next/head";

export async function getServerSideProps() {
  // you must provide full URL to your Frames app so we can fetch meta tags
  const framesMetaTags = await fetchMetadata(
    new URL("/api", process.env.VERCEL_URL || "http://localhost:3000")
  );

  return {
    props: {
      framesMetaTags,
    },
  };
}

export default function Home({ framesMetaTags }) {
  return (
    <div>
      <Head>
        <title>My Frames</title>
        {metadataToMetaTags(framesMetaTags)}
      </Head>
      <h1>My page</h1>
    </div>
  );
}
```
