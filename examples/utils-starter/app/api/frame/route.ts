import {
  Frame,
  getFrameHtml,
  getFrameMessageFromRequestBody,
  validateFrameMessage,
} from "frames.js";
import { NextRequest, NextResponse } from "next/server";
import { HOST, framePostUrl } from "../../constants";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const untrustedMessage = getFrameMessageFromRequestBody(body);

  if (untrustedMessage.data?.frameActionBody?.buttonIndex === 2) {
    const resp = NextResponse.redirect(`${HOST}/redirect`, 302);
    return resp;
  }

  const result = await validateFrameMessage(body);

  const { isValid, message } = result;
  if (!isValid || !message) {
    return new Response("Invalid message", { status: 400 });
  }

  const randomInt = Math.floor(Math.random() * 100);
  const imageUrl = `https://picsum.photos/seed/${randomInt}/1146/600`;

  const frame: Frame = {
    version: "vNext",
    image: imageUrl,
    buttons: [
      {
        label: `Next (pressed by ${message?.data.fid})`,
        action: "post",
      },
      {
        label: "Visit frames.js",
        action: "post_redirect",
      },
    ],
    ogImage: imageUrl,
    postUrl: framePostUrl,
  };

  const html = getFrameHtml(frame);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
    },
    status: 200,
  });
}
