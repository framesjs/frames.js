/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";
import { getTokenUrl } from "frames.js";

const handleRequest = frames(async (ctx) => {
  const clickedButtonIndex = ctx.pressedButton?.index;

  return {
    image: <div>{ctx.message?.inputText || "Hello world"}</div>,
    textInput: "put some text here",
    buttons: [
      <Button action="post">
        {clickedButtonIndex === 1 ? "Active" : "Inactive"}
      </Button>,
      <Button action="post">
        {clickedButtonIndex === 2 ? "Active" : "Inactive"}
      </Button>,
      <Button
        action="mint"
        target={getTokenUrl({
          address: "0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df",
          tokenId: "123",
          chainId: 7777777,
        })}
      >
        Mint
      </Button>,
      <Button action="link" target={"https://www.google.com"}>
        External
      </Button>,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
