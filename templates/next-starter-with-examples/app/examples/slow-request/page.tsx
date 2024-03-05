import { kv } from "@vercel/kv";
import {
  FrameButton,
  FrameContainer,
  FrameImage,
  NextServerPageProps,
  getFrameMessage,
  getPreviousFrame,
} from "frames.js/next/server";
import Link from "next/link";
import { RandomNumberRequestStateValue } from "./slow-fetch/types";
import { currentURL } from "../../utils";
import { DEFAULT_DEBUGGER_HUB_URL, createDebugUrl } from "../../debug";

type State = {};

const initialState: State = {} as const;

// This is a react server component only
export default async function Home({ searchParams }: NextServerPageProps) {
  const url = currentURL("/examples/slow-request");
  const previousFrame = getPreviousFrame<State>(searchParams);

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    hubHttpUrl: DEFAULT_DEBUGGER_HUB_URL,
  });

  if (frameMessage && !frameMessage?.isValid) {
    throw new Error("Invalid frame payload");
  }

  let frame: React.ReactElement;

  const intialFrame = (
    <FrameContainer
      postUrl="/examples/slow-request/frames"
      pathname="/examples/slow-request"
      state={initialState}
      previousFrame={previousFrame}
    >
      <FrameImage>
        <div tw="w-full h-full bg-slate-700 text-white justify-center items-center">
          This random number generator takes 10 seconds to respond
        </div>
      </FrameImage>
      <FrameButton>Generate</FrameButton>
    </FrameContainer>
  );

  const checkStatusFrame = (
    <FrameContainer
      postUrl="/examples/slow-request/frames"
      pathname="/examples/slow-request"
      state={initialState}
      previousFrame={previousFrame}
    >
      <FrameImage>
        <div tw="w-full h-full bg-slate-700 text-white justify-center items-center">
          Loading...
        </div>
      </FrameImage>
      <FrameButton>Check status</FrameButton>
    </FrameContainer>
  );

  const errorFrame = (error: string) => (
    <FrameContainer
      postUrl="/examples/slow-request/frames"
      pathname="/examples/slow-request"
      state={initialState}
      previousFrame={previousFrame}
    >
      <FrameImage>{error}</FrameImage>
      <FrameButton target={"/examples/slow-request/frames?retry=true"}>
        Retry
      </FrameButton>
    </FrameContainer>
  );

  if (frameMessage) {
    const { requesterFid } = frameMessage;

    const uniqueId = `fid:${requesterFid}`;

    const existingRequest =
      await kv.get<RandomNumberRequestStateValue>(uniqueId);

    if (existingRequest) {
      switch (existingRequest.status) {
        case "pending":
          frame = checkStatusFrame;
          break;
        case "success":
          // if retry is true, then try to generate again and show checkStatusFrame
          if (searchParams?.reset === "true") {
            // reset to initial state
            await kv.del(uniqueId);

            frame = intialFrame;
          } else {
            frame = (
              <FrameContainer
                postUrl="/examples/slow-request/frames"
                pathname="/examples/slow-request"
                state={initialState}
                previousFrame={previousFrame}
              >
                <FrameImage>
                  <div tw="w-full h-full bg-slate-700 text-white justify-center items-center flex">
                    The number is {existingRequest.data}
                  </div>
                </FrameImage>
                <FrameButton
                  target={"/examples/slow-request/frames?reset=true"}
                >
                  Reset
                </FrameButton>
              </FrameContainer>
            );
          }
          break;
        case "error":
          // if retry is true, then try to generate again and show checkStatusFrame
          if (searchParams?.retry === "true") {
            // reset to initial state
            await kv.del(uniqueId);

            frame = intialFrame;
          } else {
            frame = errorFrame(existingRequest.error);
          }
          break;
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
          "/examples/slow-request/slow-fetch",
          process.env.NEXT_PUBLIC_HOST
        ).toString(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postBody: JSON.parse(searchParams?.postBody as string),
          }),
        }
      );

      frame = checkStatusFrame;
    }
  } else {
    frame = intialFrame;
  }

  // then, when done, return next frame
  return (
    <div className="p-4">
      frames.js starter kit with slow requests.{" "}
      <Link href={createDebugUrl(url)} className="underline">
        Debug
      </Link>
      {frame}
    </div>
  );
}
