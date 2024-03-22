import { frames } from "../frames/route";

export const POST = frames(async (ctx) => {
  return {
    image: (
      <div tw="flex">
        You are{" "}
        {ctx.message?.requesterCustodyAddress ||
          ctx.message?.verifiedWalletAddress}
      </div>
    ),
  };
});
