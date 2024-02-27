import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  NextServerPageProps,
  getPreviousFrame,
  getFrameMessage,
} from "frames.js/next/server";
import Link from "next/link";
import { kv } from "@vercel/kv";
import { DEBUG_HUB_OPTIONS } from "../../debug/constants";
import { PromptToImageRequestStateValue } from "./slow-fetch/route";

type State = {
  page: "homeframe";
};

const initialState: State = { page: "homeframe" } as const;

// This is a react server component only
export default async function Home({
  params,
  searchParams,
}: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams);

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    ...DEBUG_HUB_OPTIONS,
  });

  if (frameMessage && !frameMessage?.isValid) {
    throw new Error("Invalid frame payload");
  }

  let frame: React.ReactElement;

  const imagineFrame = (
    <FrameContainer
      postUrl="/examples/slow-request/frames"
      pathname="/examples/slow-request"
      state={initialState}
      previousFrame={previousFrame}
    >
      <FrameImage>
        <div tw="w-full h-full bg-slate-700 text-white justify-center items-center">
          Prompt dall-e
        </div>
      </FrameImage>
      <FrameInput text="prompt dall-e" />
      <FrameButton>Imagine</FrameButton>
      <FrameButton>Check previous image</FrameButton>
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

  const openImageFrame = (imgUrl: string) => (
    <FrameContainer
      postUrl="/examples/slow-request/frames"
      pathname="/examples/slow-request"
      state={initialState}
      previousFrame={previousFrame}
    >
      <FrameImage src={imgUrl} />
      <FrameButton action="link" target={imgUrl}>
        Open image
      </FrameButton>
      <FrameButton target={"/examples/slow-request/frames?reset=true"}>
        Reset
      </FrameButton>
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
      await kv.get<PromptToImageRequestStateValue>(uniqueId);

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

            frame = imagineFrame;
          } else {
            frame = openImageFrame(existingRequest.data.data[0]!.url);
          }
          break;
        case "error":
          // if retry is true, then try to generate again and show checkStatusFrame
          if (searchParams?.retry === "true") {
            // reset to initial state
            await kv.del(uniqueId);

            frame = imagineFrame;
          } else {
            frame = errorFrame(existingRequest.error);
          }
          break;
      }
    } else if (frameMessage.inputText && frameMessage.inputText.trim()) {
      await kv.set<PromptToImageRequestStateValue>(
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
    } else {
      frame = imagineFrame;
    }
  } else {
    frame = imagineFrame;
  }

  // then, when done, return next frame
  return (
    <div className="p-4">
      frames.js starter kit with slow requests.{" "}
      <Link
        href={`/debug?url=${process.env.NEXT_PUBLIC_HOST || "http://localhost:3000"}`}
        className="underline"
      >
        Debug
      </Link>
      {frame}
    </div>
  );
}
