# @frames.js/remix

Build your frames.js app using [Remix](https://remix.run).

## Installation

```sh
$ npm install @frames.js/remix
$ yarn add @frames.js/remix
$ pnpm add @frames.js/remix
```

## Usage

### Build your first Frames

```tsx
// app/routes/frames.tsx
import { createFrames, Button } from "@frames.js/remix";

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

export const action = framesRouteHandler;
export const loader = framesRouteHandler;
```

#### Rendering Frames meta tags on existing Remix page

In order to render metadata on your existing Remix page you can use `fetchMetadata()` function and return these from [meta function](https://remix.run/docs/en/main/route/meta#data).

```tsx
// app/routes/_index.tsx
import { fetchMetadata } from "@frames.js/next";

export async function loader({ request }: LoaderFunctionArgs) {
  const framesMetadata = await fetchMetadata(new URL("/frames", request.url));

  return json({
    metadata: framesMetadata,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: "My Page Title" }, ...data.metadata];
};

export default function Page() {
  return <div>My Remix Page</div>;
}
```
