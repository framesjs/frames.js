import path from "path";
import fs from "fs";
import express, { Application, Request, Response } from "express";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { originalUrl, frameExpress } from "./frameExpress"
import {  DEBUG_HUB_OPTIONS, HOST, PORT, imageUrl, framePostUrl } from "../src/constants";
import POST from "../src/frames";
import App from "../src/App";

const app: Application = express();
app.use(express.json());
app.use(express.static(path.join(__dirname,'..','dist')))

app.get("/", async (req: Request, res: Response) => {

  const ogImage = "https://framesjs.org/og.png";
  const postUrl = `${originalUrl(req)}frames`;

  return res.send(
    frameExpress({
      imageUrl: ogImage,
      imageAspectRatio: "1.91:1",
      postUrl: postUrl,
      buttons: [
        {
          label: "Next",
          action: "post",
        },
        {
          label: "Visit frames.js",
          action: "post_redirect",
        },
      ],
      inputText: "Type something",
    })
  );

});

app.post("/frames", async (req: Request, res: Response) => {
    return await POST(req, res);
});

try {
    app.listen(PORT, (): void => {
      console.log(`Server running on port ${PORT}`);
    });
} catch (error: any) {
    console.error(`Error occured: ${error.message}`);
}