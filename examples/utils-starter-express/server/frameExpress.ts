import { Request } from "express";
import { FrameContents } from "../src/types"
import {
    Frame,
    getFrameHtml,
} from "frames.js";

export const originalUrl = (request: Request) => `${request.protocol}://${request.headers.host}${request.originalUrl}`; 

export const frameExpress = (frameContents: FrameContents) => {

  const frame: Frame = {
    version: "vNext",
    image: frameContents.imageUrl,
    imageAspectRatio: frameContents.imageAspectRatio ?? "1:91:1",
    buttons: frameContents.buttons ?? [],
    ogImage: frameContents.imageUrl,
    postUrl: frameContents.postUrl,
    inputText: frameContents.inputText
  };

  const html = getFrameHtml(frame);
  return html;

};
