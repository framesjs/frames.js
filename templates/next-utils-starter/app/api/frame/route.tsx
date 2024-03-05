import {
  getFrameMessageFromRequestBody,
  validateFrameMessage,
} from "frames.js";
import { redirect } from "frames.js/core";
import { createFrames, Button } from "frames.js/next";

const frames = createFrames();

const handleRequest = frames(async (ctx) => {
  const body = await ctx.request.clone().json();

  const untrustedMessage = getFrameMessageFromRequestBody(body);

  if (untrustedMessage.data?.frameActionBody?.buttonIndex === 2) {
    return redirect(new URL("/redirect", ctx.url), { status: 302 });
  }

  const result = await validateFrameMessage(body);

  const { isValid, message } = result;

  if (!isValid || !message) {
    return {
      image: <span>Invalid message</span>,
    };
  }

  const randomInt = Math.floor(Math.random() * 100);
  const imageUrl = `https://picsum.photos/seed/${randomInt}/1146/600`;

  return {
    image: imageUrl,
    buttons: [
      <Button action="post" key="1">
        {`Next (pressed by ${message?.data.fid.toString()})`}
      </Button>,
      <Button action="link" key="2" target={"https://framesjs.org"}>
        Visit frames.js
      </Button>,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
