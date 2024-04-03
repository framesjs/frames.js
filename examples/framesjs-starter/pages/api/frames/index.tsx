/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next/pages-router";
import { frames } from "../frames-config";
import { NextApiResponse, NextApiRequest } from "next";
import { NextRequest, NextResponse } from "next/server";

const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log("Request received", req.method, req.url);

  await frames(async (ctx) => {
    return {
      image: (
        <span>
          Hello there: {ctx.pressedButton ? "✅" : "❌"}
          {ctx.message?.inputText ? `, Typed: ${ctx.message?.inputText}` : ""}
        </span>
      ),
      buttons: [
        <Button action="post" target="/">
          Click me
        </Button>,
      ],
      textInput: "Type something!",
    };
    // @ts-ignore
  })(req, res);
};

export default handleRequest;
