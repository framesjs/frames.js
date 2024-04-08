import { frames } from "./frames";

const handler = frames(async (ctx) => {
  return {
    image: <div>Hello world</div>,
  };
});

export const GET = handler;
export const POST = handler;
