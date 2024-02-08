import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  NextServerPageProps,
  getPreviousFrame,
  useFramesReducer,
  getFrameMessage,
} from "frames.js/next/server";
import Link from "next/link";
import { kv } from "@vercel/kv";
import { DEBUG_HUB_OPTIONS } from "../../debug/constants";

type State = {
  page: "homeframe";
};

const initialState = { page: "homeframe" } as const;

const reducer: FrameReducer<State> = (state, action) => {
  return {
    page: "homeframe",
  };
};

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

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  let frame;
  if (frameMessage) {
    const { castId, requesterFid } = frameMessage;

    const uniqueId = `fid:${requesterFid}`;

    if (searchParams?.retry === "true") {
      console.log("reset req");
      await kv.set(uniqueId, null);
    }
    const existingRequests = await kv.get<{
      error: string | null;
      status: string;
      data: any;
      timestamp: number;
    }>(uniqueId);

    console.log(existingRequests);

    if (existingRequests) {
      if (searchParams?.retry !== "true") {
        if (existingRequests.status === "error" || existingRequests.error)
          frame = (
            <FrameContainer
              postUrl="/examples/slow-request/frames"
              pathname="/examples/slow-request"
              state={state}
              previousFrame={previousFrame}
            >
              <FrameImage>{existingRequests.error as string}</FrameImage>
              <FrameButton target={"/examples/slow-request/frames?retry=true"}>
                Retry
              </FrameButton>
            </FrameContainer>
          );
        else {
          frame = (
            <FrameContainer
              postUrl="/examples/slow-request/frames"
              pathname="/examples/slow-request"
              state={state}
              previousFrame={previousFrame}
            >
              <FrameImage src="" />
              <FrameButton action="link" target="https://xyz">
                Open image
              </FrameButton>
            </FrameContainer>
          );
        }
      } else {
        frame = (
          <FrameContainer
            postUrl="/examples/slow-request/frames"
            pathname="/examples/slow-request"
            state={state}
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
        if (JSON.parse(searchParams?.postBody as string)?.inputText) {
          console.log("Slow-fetch", searchParams?.postBody);

          // start request, don't await it! Return a loading page, let this run in the background
          fetch(
            `${process.env.NEXT_PUBLIC_HOST}/examples/slow-request/slow-fetch`,
            {
              method: "POST",
              body: JSON.stringify({
                postBody: JSON.parse(searchParams?.postBody as string),
              }),
            }
          );
        }
      }
    } else {
      frame = (
        <FrameContainer
          postUrl="/examples/slow-request/frames"
          pathname="/examples/slow-request"
          state={state}
          previousFrame={previousFrame}
        >
          <FrameImage>
            <div tw="w-full h-full bg-slate-700 text-white justify-center items-center">
              Prompt dall-e
            </div>
          </FrameImage>
          <FrameInput text="prompt dall-e" />
          <FrameButton>Imagine</FrameButton>
        </FrameContainer>
      );
    }
  } else {
    frame = (
      <FrameContainer
        postUrl="/examples/slow-request/frames"
        pathname="/examples/slow-request"
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage>
          <div tw="w-full h-full bg-slate-700 text-white justify-center items-center">
            Prompt dall-e
          </div>
        </FrameImage>
        <FrameInput text="prompt dall-e" />
        <FrameButton>Imagine</FrameButton>
      </FrameContainer>
    );
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
