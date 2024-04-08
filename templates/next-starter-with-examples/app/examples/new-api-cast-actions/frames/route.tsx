/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";
import { constructCastActionUrl } from "../utils";

export const GET = frames(async (ctx) => {
  const currentUrl = new URL(ctx.url.toString());
  currentUrl.pathname = "/examples/new-api-cast-actions/frames";

  const installActionUrl = constructCastActionUrl({
    actionType: "post",
    icon: "number",
    name: "Check FID",
    postUrl: currentUrl.toString(),
  });

  return {
    image: <div>FID Action</div>,
    buttons: [
      <Button action="link" target={installActionUrl}>
        Install
      </Button>,
    ],
  };
});

export const POST = frames(async (ctx) => {
  return Response.json({
    message: `The user's FID is ${ctx.message?.castId?.fid}`,
  });
});
