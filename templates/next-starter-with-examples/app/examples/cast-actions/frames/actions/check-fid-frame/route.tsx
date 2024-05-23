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
    name: "Check FID Frame",
    aboutUrl: `${appURL()}/examples/cast-actions`,
    description: "Check the FID of the caster and returns a frame.",
  };

  return Response.json(actionMetadata);
};

export const POST = frames(async (ctx) => {
  return Response.json({
    type: "frame",
    frameUrl: `${appURL()}/examples/cast-actions/frames/check-fid`,
  });
});
