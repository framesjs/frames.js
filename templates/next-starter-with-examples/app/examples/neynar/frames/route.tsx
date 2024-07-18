import { frames } from "./frames";

const handler = frames(async (ctx) => {
  return {
    image: (
      <div tw="flex flex-col">
        <div>
          gm{" "}
          {ctx.message?.action.interactor.display_name ||
            ctx.message?.action.interactor.username}
        </div>
        <div>This is the cast hash: {ctx.message?.action.cast.hash}</div>
      </div>
    ),
  };
});

export const GET = handler;
export const POST = handler;
