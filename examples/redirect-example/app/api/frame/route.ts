import {
  FrameMetadata,
  frameMetadataToHtmlText,
  getFrameMessageFromRequestBody,
} from "@framejs/core";
import { validateFrameMessage } from "@framejs/nodejs";
import { NextRequest } from "next/server";
import {
  HOST,
  frameImage,
  frameImageFlipped,
  framePostUrl,
  ogImage,
} from "../../constants";

export async function POST(request: NextRequest) {
  const shouldFlip = request.nextUrl.searchParams.get("flip") !== "false";
  const body = await request.json();

  const untrustedMessage = getFrameMessageFromRequestBody(body);

  if (untrustedMessage.data?.frameActionBody?.buttonIndex === 2) {
    return Response.redirect(`${HOST}/redirect`, 302);
  }

  const result = await validateFrameMessage(body);
  const { isValid, message } = result;
  if (!isValid) {
    return new Response("Invalid message", { status: 400 });
  }

  const frame: FrameMetadata = {
    version: "vNext",
    image: shouldFlip ? frameImageFlipped : frameImage,
    buttons: [
      {
        label: `Flip back (pressed by ${message?.data.fid})`,
      },
      {
        label: "Visit frames.js",
        action: "post_redirect",
      },
    ],
    ogImage: ogImage,
    postUrl: `${framePostUrl}?flip=false`,
  };

  const html = frameMetadataToHtmlText(frame);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
    },
    status: 200,
  });
}
