import { frames } from "./frames";

const handler = frames(async (ctx) => {
  return {
    image: (
      <div tw="flex flex-col">
        <div tw="text-[52px]">Hello world</div>
        <div tw="text-[52px] font-bold">Bold font</div>
      </div>
    ),
  };
});

export const GET = handler;
export const POST = handler;
