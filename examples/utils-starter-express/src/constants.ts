import { HubHttpUrlOptions } from "frames.js";

export const HOST = process.env["PUBLIC_HOST"] || "http://localhost:3005";
export const PORT = 3005;

export const ogImage = `${HOST}/image.png`;
export const frameImage = `${HOST}/image_frame.png`;
export const frameImageFlipped = `${HOST}/image_frame_flipped.png`;
export const framePostUrl = `${HOST}/frames`;
export const imageUrl = `https://framesjs.org/og.png`;