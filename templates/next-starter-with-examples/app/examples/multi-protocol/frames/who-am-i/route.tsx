/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "../frames";

export const POST = frames(async (ctx) => {
  const walletAddress = await ctx.walletAddress();

  return {
    image: (
      <div tw="flex p-5">
        You are {walletAddress || "anonymous"} from {ctx.clientProtocol?.id}
      </div>
    ),
    buttons: [
      <Button target={"/"} action="post">
        Back
      </Button>,
    ],
  };
});
