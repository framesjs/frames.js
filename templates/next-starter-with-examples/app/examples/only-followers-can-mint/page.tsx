import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameReducer,
  NextServerPageProps,
  getFrameMessage,
  getPreviousFrame,
  useFramesReducer,
} from "frames.js/next/server";
import Link from "next/link";
import { getTokenUrl } from "frames.js";
import { zora } from "viem/chains";
import { DEFAULT_DEBUGGER_HUB_URL, createDebugUrl } from "../../debug";
import { currentURL } from "../../utils";

type State =
  | {
      page: "initial";
    }
  | { page: "result" };

const initialState: State = { page: "initial" };

const reducer: FrameReducer<State> = (state, action) => {
  const buttonIndex = action.postBody?.untrustedData.buttonIndex;

  switch (state.page) {
    case "initial":
      return buttonIndex === 1 ? { page: "result" } : state;
    case "result":
      return buttonIndex === 1 ? { page: "initial" } : state;
    default:
      return { page: "initial" };
  }
};

// This is a react server component only
export default async function Home({
  params,
  searchParams,
}: NextServerPageProps) {
  const url = currentURL("/examples/slow-request");

  const previousFrame = getPreviousFrame<State>(searchParams);

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    hubHttpUrl: DEFAULT_DEBUGGER_HUB_URL,
  });

  console.log("info: frameMessage is:", frameMessage);

  if (frameMessage && !frameMessage?.isValid) {
    throw new Error("Invalid frame payload");
  }

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT
  console.log("info: state is:", state);

  const initialPage = [
    <FrameImage key="image">
      <div style={{ display: "flex", flexDirection: "column" }}>
        You can mint if you follow the caster.
      </div>
    </FrameImage>,
    <FrameButton key="button">Am I?</FrameButton>,
  ];

  const resultPage = [
    <FrameImage key="image">
      <div style={{ display: "flex", flexDirection: "column" }}>
        {frameMessage?.requesterFollowsCaster
          ? "You are following the caster."
          : "You are not following the caster"}
      </div>
    </FrameImage>,
    <FrameButton key="back-button">←</FrameButton>,
    frameMessage?.requesterFollowsCaster ? (
      <FrameButton
        action="mint"
        key="mint-button"
        target={getTokenUrl({
          address: "0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df",
          chain: zora,
          tokenId: "1",
        })}
      >
        Mint
      </FrameButton>
    ) : null,
  ];

  // then, when done, return next frame
  return (
    <div>
      Only followers can mint example.{" "}
      <Link href={createDebugUrl(url)}>Debug</Link>
      <FrameContainer
        pathname="/examples/only-followers-can-mint"
        postUrl="/examples/only-followers-can-mint/frames"
        state={state}
        previousFrame={previousFrame}
      >
        {state.page === "initial" ? initialPage : resultPage}
      </FrameContainer>
    </div>
  );
}
