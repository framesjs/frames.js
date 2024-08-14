/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";

const handleRequest = frames(async (ctx) => {
  if (ctx.message?.transactionId) {
    return {
      image: (
        <div tw="bg-purple-800 text-white w-full h-full justify-center items-center flex">
          {ctx.message.address
            ? `Transaction ${ctx.message.transactionId} from ${ctx.message.address} submitted!`
            : `Transaction ${ctx.message.transactionId} submitted!`}
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
        Rent farcaster storage or send to yourself
      </div>
    ),
    imageOptions: {
      aspectRatio: "1:1",
    },
    buttons: [
      <Button action="tx" target="/txdata" post_url="/">
        Buy a unit
      </Button>,
      <Button action="tx" target="/txdata-self" post_url="/">
        Send to yourself
      </Button>,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
