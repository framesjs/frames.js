import { frames } from "./frames";

const handler = frames(async (ctx) => {
  return {
    image: (
      <div tw="flex text-[52px]">
        Hello <span tw="ml-2 font-bold flex">world</span>
      </div>
    ),
  };
});

export const GET = handler;
export const POST = handler;
