import { NextRequest } from "next/server";
import { appURL } from "../../../../../utils";
import { frames } from "../../frames";
import { composerAction, composerActionForm, error } from "frames.js/core";

export const GET = async (req: NextRequest) => {
  return composerAction({
    action: {
      type: "post",
    },
    icon: "trophy",
    name: "Create a game",
    aboutUrl: `${appURL()}/examples/composer-actions`,
    description: "Guess a number game.",
    imageUrl: "https://framesjs.org/logo.png",
  });
};

export const POST = frames(async (ctx) => {
  const walletAddress = await ctx.walletAddress();

  const createGameUrl = new URL(
    "/examples/composer-actions/create-game",
    appURL()
  );

  if (walletAddress) {
    createGameUrl.searchParams.set("uid", walletAddress);
  } else {
    return error("Must be authenticated");
  }

  // in case of composer actions we can't use ctx.state because the composer actions
  if (!ctx.composerActionState) {
    return error("Must be called from composer");
  }

  createGameUrl.searchParams.set(
    "state",
    JSON.stringify(ctx.composerActionState)
  );

  return composerActionForm({
    title: "Create a game",
    url: createGameUrl.toString(),
  });
});
