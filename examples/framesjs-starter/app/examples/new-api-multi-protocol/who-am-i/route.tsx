import { frames } from "../frames/route";

export const POST = frames(async (ctx) => {
  return {
    image: (
      <div tw="flex p-5">
        You are{" "}
        {ctx.message?.requesterCustodyAddress ||
          ctx.message?.verifiedWalletAddress}{" "}
        from {ctx.clientProtocol?.id}
      </div>
    ),
  };
});
