import { NextRequest } from "next/server";
import { vercelURL } from "../../../../../utils";
import { frames } from "../../frames";
import { appURL } from "../../../utils";

export type ActionMetadata = {
  /** The action name. Must be less than 30 characters. */
  name: string;
  /** An [Octicons](https://primer.style/foundations/icons) icon name. */
  icon: string;
  /** A short description up to 80 characters. */
  description: string;
  /** External link to an "about" page for extended description. */
  aboutUrl: string;
  /** The action type. (Same type options as frame buttons). Only post is accepted in V1. */
  action: {
    type: "post";
  };
};

export const GET = async (req: NextRequest) => {
  const actionMetadata: ActionMetadata = {
    action: {
      type: "post",
    },
    icon: "number",
    name: "Check FID",
    aboutUrl: `${appURL()}/examples/new-api-cast-actions`,
    description: "Check the FID of the caster.",
  };

  return Response.json(actionMetadata);
};

export const POST = frames(async (ctx) => {
  return Response.json({
    message: `The user's FID is ${ctx.message?.castId?.fid}`,
  });
});
