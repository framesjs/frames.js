import dotenv from "dotenv";
import {
    Frame,
    getFrameHtml,
    getFrameMessageFromRequestBody,
    validateFrameMessage,
  } from "frames.js";
  import { Request, Response } from "express";
  import { HOST, framePostUrl } from "../constants";
  dotenv.config();

  export default async function POST(request: Request, response: Response) {
    const body = request.body;

    const untrustedMessage = getFrameMessageFromRequestBody(body);

    if (untrustedMessage.data?.frameActionBody?.buttonIndex === 2) {
      const resp = response.redirect(302, `${HOST}`);
      return resp;
    }
  
    const result = await validateFrameMessage(body);

    const { isValid, message } = result;
    if (!isValid || !message) {
      return response.status(400).json(
        {
          message:
            "Invalid message"
        }
      );
    }
    
    const randomInt = Math.floor(Math.random() * 100);
    const imageUrl = `https://picsum.photos/seed/${randomInt}/1146/600`;
  
    const frame: Frame = {
      version: "vNext",
      image: imageUrl,
      imageAspectRatio: "1.91:1",
      buttons: [
        {
          label: `Next (pressed by ${message?.data.fid})`,
          action: "post",
        },
        {
          label: "Visit frames.js",
          action: "link",
          target: "https://framesjs.org"
        },
      ],
      ogImage: imageUrl,
      postUrl: framePostUrl,
    };
  
    const html = getFrameHtml(frame);

    return response.status(200).send(html);
  }
  