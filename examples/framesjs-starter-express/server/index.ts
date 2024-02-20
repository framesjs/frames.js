import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import express, { Application, Request, Response } from "express";
import React from "react";
import ReactDOMServer from "react-dom/server";
import {
  Frame,
  getFrameHtml,
  getPreviousFrame,
  getFrameMessageFromRequestBody,
  validateFrameMessage,
  getTokenUrl,
  getByteLength
} from "frames.js";
import type { 
  ActionIndex, 
  FrameReducer, 
  RedirectHandler, 
  FrameState, 
  PreviousFrame, 
  Dispatch 
} from "frames.js/next/server";
import { getOgImageFromWorker } from "frames.js"
import { originalUrl, frameExpress } from "./frameExpress"
import { useFramesReducer, getFrameMessage, encodeString, decodeString } from "../src/helpers";
import { DEBUG_HUB_OPTIONS, PORT } from "../src/constants";
import App from "../src/App";

type State = {
  active: string;
  total_button_presses: number;
};

dotenv.config();

const app: Application = express();
const initialState = { active: "1", total_button_presses: 0 };
// Setting locals variables to store the frame state and body
app.locals.searchParams = new URLSearchParams();
app.locals.urlSearchParams = new URLSearchParams();

const reducer: FrameReducer<State> = (state, action) => {
  return {
    total_button_presses: state.total_button_presses + 1,
    active: action.postBody?.untrustedData.buttonIndex
      ? String(action.postBody?.untrustedData.buttonIndex)
      : "1",
  };
};

app.use(express.json());
app.use(express.static(path.join(__dirname,'..','dist')))

app.get("/", async (req: Request, res: Response): Promise<Response> => {

    console.log('REQ.BODY ===> ', req.body);
    req.app.locals.searchParams.set("postBody", Object.keys(req.body).length === 0 ? null : JSON.stringify(req.body));
    req.app.locals.searchParams.set("pathname", "/");
    const redirectMap = {}
    
    const postUrl = `/frames`;

    const previousFrame = getPreviousFrame<State>(req, req.app.locals.searchParams);

    const frameMessage = await getFrameMessage(previousFrame.postBody, {
      ...DEBUG_HUB_OPTIONS,
    });

    if (frameMessage && !frameMessage?.isValid) {
      throw new Error("Invalid frame payload");
    }

    const [state, dispatch] = useFramesReducer<State>(
      reducer,
      initialState,
      previousFrame
    );
  
    req.app.locals.searchParams.set("prevState", JSON.stringify(state));

    // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
    // example: load the users credentials & check they have an NFT
  
    console.log("info: state is:", state);
  
    if (frameMessage) {
      const {
        isValid,
        buttonIndex,
        inputText,
        castId,
        requesterFid,
        casterFollowsRequester,
        requesterFollowsCaster,
        likedCast,
        recastedCast,
        requesterCustodyAddress,
        requesterVerifiedAddresses,
        requesterUserData,
      } = frameMessage;
  
      console.log("info: frameMessage is:", frameMessage);
    }

    // short for pathname
    req.app.locals.urlSearchParams.set("p", req.app.locals.searchParams.pathname ?? previousFrame.headers.pathname ?? "/");
    // short for state
    req.app.locals.urlSearchParams.set("s", JSON.stringify(state));
    // short for redirects
    req.app.locals.urlSearchParams.set("r", JSON.stringify(redirectMap));

    const postUrlRoute = postUrl.startsWith("/")
      ? `${previousFrame.headers.urlWithoutPathname}${postUrl}`
      : postUrl;

    const postUrlFull = `${postUrlRoute}?${req.app.locals.urlSearchParams.toString()}`;
    if (getByteLength(postUrlFull) > 256) {
      console.error(
        `post_url is too long. ${postUrlFull.length} bytes, max is 256. The url is generated to include your state and the redirect urls in <FrameButton href={s. In order to shorten your post_url, you could try storing less in state, or providing redirects via the POST handler's second optional argument instead, which saves url space. The generated post_url was: `,
        postUrlFull
      );
      throw new Error("post_url is more than 256 bytes");
    }

    console.log('postUrlFull --==> ', postUrlFull)

    return res.send(
      frameExpress({
        imageUrl: await getOgImageFromWorker('Hello world','1.91:1','png') ?? "https://framesjs.org/og.png",
        imageAspectRatio: "1.91:1",
        postUrl: postUrlFull,
        inputText: "put some text here",
        buttons: [
          {
            label: state?.active === "1" ? "Active" : "Inactive",
            action: "post"
          },
          {
            label: state?.active === "2" ? "Active" : "Inactive",
            action: "post"
          },
          {
            label: "External",
            action: "link",
            target: "https://www.google.com"
          }
        ]
      })
    );

});

app.post("/frames", async (req: Request, res: Response): Promise<Response> => {

  console.log('REQ.BODY ===> ', req.body);
  //const postUrl = originalUrl(req);
  const postUrl = `/frames`;
  const redirectMap = {};

  req.app.locals.searchParams.set("postBody", Object.keys(req.body).length === 0 ? null : JSON.stringify(req.body));

  const previousFrame = getPreviousFrame<State>(req, req.app.locals.searchParams);

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    ...DEBUG_HUB_OPTIONS,
  });

  if (frameMessage && !frameMessage?.isValid) {
    throw new Error("Invalid frame payload");
  }
  
  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );
  req.app.locals.searchParams.set("prevState", JSON.stringify(state));

  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT

  console.log("info: state is:", state);

  if (frameMessage) {
    const {
      isValid,
      buttonIndex,
      inputText,
      castId,
      requesterFid,
      casterFollowsRequester,
      requesterFollowsCaster,
      likedCast,
      recastedCast,
      requesterCustodyAddress,
      requesterVerifiedAddresses,
      requesterUserData,
    } = frameMessage;

    console.log("info: frameMessage is:", frameMessage);
  }

  const inputText = previousFrame.postBody.untrustedData.inputText;

      // short for pathname
      req.app.locals.urlSearchParams.set("p", req.app.locals.searchParams.pathname ?? previousFrame.headers.pathname ?? "/");
      // short for state
      req.app.locals.urlSearchParams.set("s", JSON.stringify(state));
      // short for redirects
      req.app.locals.urlSearchParams.set("r", JSON.stringify(redirectMap));
  
      const postUrlRoute = postUrl.startsWith("/")
        ? `${previousFrame.headers.urlWithoutPathname}${postUrl}`
        : postUrl;
  
      const postUrlFull = `${postUrlRoute}?${req.app.locals.urlSearchParams.toString()}`;
      if (getByteLength(postUrlFull) > 256) {
        console.error(
          `post_url is too long. ${postUrlFull.length} bytes, max is 256. The url is generated to include your state and the redirect urls in <FrameButton href={s. In order to shorten your post_url, you could try storing less in state, or providing redirects via the POST handler's second optional argument instead, which saves url space. The generated post_url was: `,
          postUrlFull
        );
        throw new Error("post_url is more than 256 bytes");
      }
  
      console.log('postUrlFull --==> ', postUrlFull)


  return res.send(
    frameExpress({
      imageUrl: await getOgImageFromWorker(inputText,'1.91:1','png') ?? "https://framesjs.org/og.png",
      imageAspectRatio: "1.91:1",
      postUrl: postUrlFull,
      inputText: "put some text here",
      buttons: [
        {
          label: state?.active === "1" ? "Active" : "Inactive",
          action: "post"
        },
        {
          label: state?.active === "2" ? "Active" : "Inactive",
          action: "post"
        },
        {
          label: "External",
          action: "link",
          target: "https://www.google.com"
        }
      ]
    })
  );
});

try {
    app.listen(PORT, (): void => {
      console.log(`Server running on port ${PORT}`);
    });
} catch (error: any) {
    console.error(`Error occured: ${error.message}`);
}