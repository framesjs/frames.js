import {
  FrameContainer,
  FrameImage,
  FrameButton,
  FrameReducer,
  useFramesReducer,
  getPreviousFrame,
  validateActionSignature,
  FrameInput,
} from "frames.js/next/server";
import Link from "next/link";

import * as fs from "fs";
import { join } from "path";
import satori from "satori";

const interRegPath = join(process.cwd(), "public/Inter-Regular.ttf");
let interReg = fs.readFileSync(interRegPath);

type State = {
  active: string;
};

const initialState = { active: "1" };

const reducer: FrameReducer<State> = (state, action) => {
  return {
    active: action.postBody?.untrustedData.buttonIndex
      ? String(action.postBody?.untrustedData.buttonIndex)
      : "1",
  };
};

// This is a react server component only
export default async function Home({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const previousFrame = getPreviousFrame<State>(searchParams);
  await validateActionSignature(previousFrame.postBody);
  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT

  const imageSvg = await satori(
    <div
      style={{
        display: "flex", // Use flex layout
        flexDirection: "row", // Align items horizontally
        alignItems: "stretch", // Stretch items to fill the container height
        width: "100%",
        height: "100vh", // Full viewport height
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 24,
          paddingRight: 24,
          lineHeight: 1.2,
          fontSize: 36,
          color: "black",
          flex: 1,
          overflow: "hidden",
          marginTop: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            overflow: "hidden",
          }}
        >
          Button index: {previousFrame.postBody?.untrustedData.buttonIndex}
        </div>
      </div>
    </div>,
    {
      width: 1146,
      height: 600,
      fonts: [
        {
          name: "Inter",
          data: interReg,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );

  // then, when done, return next frame
  return (
    <div>
      Starter kit. <Link href="/debug">Debug</Link>
      <FrameContainer
        postUrl="http://localhost:3000/frames"
        state={state}
        previousFrame={previousFrame}
      >
        {/* <FrameImage src="https://picsum.photos/seed/frames.js/1146/600" /> */}
        <FrameImage
          src={`data:image/svg+xml,${encodeURIComponent(imageSvg)}`}
        />
        <FrameInput text="put some text here" />
        <FrameButton onClick={dispatch}>
          {state?.active === "1" ? "Active" : "Inactive"}
        </FrameButton>
        <FrameButton onClick={dispatch}>
          {state?.active === "2" ? "Active" : "Inactive"}
        </FrameButton>
        <FrameButton href={`http://localhost:3000/`}>Page link</FrameButton>
        <FrameButton href={`https://www.google.com`}>External</FrameButton>
      </FrameContainer>
    </div>
  );
}
