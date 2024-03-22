/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { createFrames } from "frames.js/next";

const frames = createFrames({
  basePath: "/examples/new-api-transaction",
});

const handleRequest = frames(async (ctx) => {
  if (ctx.message?.transactionId) {
    return {
      image: (
        <div tw="bg-purple-800 text-white w-full h-full justify-center items-center flex">
          Transaction submitted! {ctx.message.transactionId}
        </div>
      ),
      imageOptions: {
        aspectRatio: "1:1",
      },
      buttons: [
        <Button
          action="link"
          target={`https://www.onceupon.gg/tx/${ctx.message.transactionId}`}
        >
          View on block explorer
        </Button>,
      ],
    };
  }

  return {
    image: (
      <div tw="bg-purple-800 text-white w-full h-full justify-center items-center">
        Rent farcaster storage
      </div>
    ),
    imageOptions: {
      aspectRatio: "1:1",
    },
    buttons: [
      <Button action="tx" target="/txdata" post_url="/frames">
        Buy a unit
      </Button>,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
