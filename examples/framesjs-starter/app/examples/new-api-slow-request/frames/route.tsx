import { kv } from "@vercel/kv";
import { types } from "frames.js/core";
import { createFrames, Button } from "frames.js/next";
import { RandomNumberRequestStateValue } from "../slow-fetch/types";

const frames = createFrames({
  basePath: "/examples/new-api-slow-request/frames",
});

const handleRequest = frames(async (ctx) => {
  const initialFrame = {
    image: (
      <div tw="w-full h-full bg-slate-700 text-white justify-center items-center">
        This random number generator takes 10 seconds to respond
      </div>
    ),
    buttons: [
      <Button action="post" key="1">
        Generate
      </Button>,
    ],
  } satisfies types.FrameDefinition<any>;

  const checkStatusFrame = {
    image: (
      <div tw="w-full h-full bg-slate-700 text-white justify-center items-center">
        Loading...
      </div>
    ),
    buttons: [
      <Button action="post" key="1">
        Check status
      </Button>,
    ],
  } satisfies types.FrameDefinition<any>;

  if (!ctx.message) {
    return initialFrame;
  }

  const { requesterFid } = ctx.message;
  const uniqueId = `fid:${requesterFid}`;

  const existingRequest = await kv.get<RandomNumberRequestStateValue>(uniqueId);

  if (existingRequest) {
    switch (existingRequest.status) {
      case "pending":
        return checkStatusFrame;
      case "success": {
        if (ctx.url.searchParams.get("reset") === "true") {
          // reset to initial state
          await kv.del(uniqueId);
        }

        return {
          image: (
            <div tw="w-full h-full bg-slate-700 text-white justify-center items-center flex">
              The number is {existingRequest.data}
            </div>
          ),
          buttons: [
            <Button
              action="post"
              key="1"
              target={{ pathname: "/", query: { reset: true } }}
            >
              Reset
            </Button>,
          ],
        } satisfies types.FrameDefinition<any>;
      }
      case "error": {
        if (ctx.url.searchParams.get("retry") === "true") {
          // reset to initial state
          await kv.del(uniqueId);

          return initialFrame;
        } else {
          return {
            image: <span>{existingRequest.error}</span>,
            buttons: [
              <Button
                action="post"
                key="1"
                target={{ pathname: "/", query: { retry: true } }}
              >
                Retry
              </Button>,
            ],
          } satisfies types.FrameDefinition<any>;
        }
      }
    }
  } else {
    await kv.set<RandomNumberRequestStateValue>(
      uniqueId,
      {
        status: "pending",
        timestamp: new Date().getTime(),
      },
      // set as pending for one minute
      { ex: 60 }
    );

    // start request, don't await it! Return a loading page, let this run in the background
    fetch(
      new URL(
        "/examples/new-api-slow-request/slow-fetch",
        process.env.NEXT_PUBLIC_HOST
      ).toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(await ctx.request.clone().json()),
      }
    );
  }

  return initialFrame;
});

export const GET = handleRequest;
export const POST = handleRequest;
