import { NextRequest } from "next/server";
import { appURL } from "../../../../../utils";
import { frames } from "../../frames";
import { castAction, castActionMessage } from "frames.js/core";

export const GET = async (req: NextRequest) => {
  return castAction({
    action: {
      type: "post",
    },
    icon: "number",
    name: "Check FID",
    aboutUrl: `${appURL()}/examples/cast-actions`,
    description: "Check the FID of the caster.",
  });
};

export const POST = frames(async (ctx) => {
  return castActionMessage(`The user's FID is ${ctx.message?.castId?.fid}`);
});
