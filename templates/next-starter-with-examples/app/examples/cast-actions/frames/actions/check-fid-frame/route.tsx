import { NextRequest } from "next/server";
import { appURL } from "../../../../../utils";
import { frames } from "../../frames";
import { castAction, castActionFrame } from "frames.js/core";

export const GET = async (req: NextRequest) => {
  return castAction({
    action: {
      type: "post",
    },
    icon: "number",
    name: "Check FID Frame",
    aboutUrl: `${appURL()}/examples/cast-actions`,
    description: "Check the FID of the caster and returns a frame.",
  });
};

export const POST = frames(async (ctx) => {
  return castActionFrame(`${appURL()}/examples/cast-actions/frames/check-fid`);
});
