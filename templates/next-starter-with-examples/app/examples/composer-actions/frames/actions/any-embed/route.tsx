import { NextRequest } from "next/server";
import { appURL } from "../../../../../utils";
import { frames } from "../../frames";
import { composerAction, composerActionForm, error } from "frames.js/core";

export const GET = async (req: NextRequest) => {
  return composerAction({
    action: {
      type: "post",
    },
    icon: "globe",
    name: "Embed any URL",
    aboutUrl: `${appURL()}/examples/composer-actions`,
    imageUrl: "https://framesjs.org/logo.png",
    description: "Embed a URL.",
  });
};

export const POST = frames(async (ctx) => {
  const walletAddress = await ctx.walletAddress();

  const formUrl = new URL("/examples/composer-actions/embed-any-url", appURL());

  if (walletAddress) {
    formUrl.searchParams.set("uid", walletAddress);
  } else {
    return error("Must be authenticated");
  }

  // in case of composer actions we can't use ctx.state because the composer actions
  if (!ctx.composerActionState) {
    return error("Must be called from composer");
  }

  formUrl.searchParams.set("state", JSON.stringify(ctx.composerActionState));

  return composerActionForm({
    title: "Embed any URL",
    url: formUrl.toString(),
  });
});
