/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "../frames";

export const POST = frames(async (ctx) => {
  if (ctx.searchParams.self) {
    return {
      image: <div tw="flex">Your FID is {ctx.message?.requesterFid}</div>,
    };
  }

  return {
    image: <div tw="flex">The user&apos;s FID is {ctx.message?.castId?.fid}</div>,
    buttons: [
      <Button
        action="post"
        target={{ pathname: "/check-fid", query: { self: true } }}
      >
        My FID
      </Button>,
    ],
  };
});
