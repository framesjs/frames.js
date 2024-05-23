import { NextRequest } from "next/server";
import { appURL } from "../../../../../utils";
import { frames } from "../../frames";
import { ActionMetadata } from "frames.js";

export const GET = async (req: NextRequest) => {
  const actionMetadata: ActionMetadata = {
    action: {
      type: "post",
    },
    icon: "number",
    name: "Check FID",
    aboutUrl: `${appURL()}/examples/cast-actions`,
    description: "Check the FID of the caster.",
  };

  return Response.json(actionMetadata);
};

export const POST = frames(async (ctx) => {
  return Response.json({
    message: `The user's FID is ${ctx.message?.castId?.fid}`,
  });
});
