/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "../frames";

const handler = frames(async () => {
  return {
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAAAAABDU1VNAAAABGdBTUEAAYagMeiWXwAAAEFJREFUeJxjZGAkABQIyLMMBQWMDwgp+PcfP2B5MBwUMMoRkGdkonlcDAYFjI/wyv7/z/iH5nExGBQwyuCVZWQEAFDl/nE14thZAAAAAElFTkSuQmCC",
    buttons: [
      <Button action="post" target="/">Go Back</Button>
    ],
  };
});

export const GET = handler;
export const POST = handler;
