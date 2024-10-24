import { NextRequest } from "next/server";
import { appURL } from "../../../../../utils";
import { frames } from "../../frames";
import { composerAction, composerActionForm, error } from "frames.js/core";

export const GET = async (req: NextRequest) => {
  return composerAction({
    action: {
      type: "post",
    },
    icon: "credit-card",
    name: "Send a tx",
    aboutUrl: `${appURL()}/examples/transaction-miniapp`,
    description: "Send ETH to address",
    imageUrl: "https://framesjs.org/logo.png",
  });
};

export const POST = frames(async (ctx) => {
  const walletAddress = await ctx.walletAddress();

  const miniappUrl = new URL("/examples/transaction-miniapp/miniapp", appURL());

  if (walletAddress) {
    miniappUrl.searchParams.set("fromAddress", walletAddress);
  } else {
    return error("Must be authenticated");
  }

  return composerActionForm({
    title: "Send ETH",
    url: miniappUrl.toString(),
  });
});
