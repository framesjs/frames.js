import { FrameActionMessage, Message } from "@farcaster/core";
import {
  FrameReducer,
  NextServerPageProps,
  getFrameMessage,
  getPreviousFrame,
  useFramesReducer,
} from "frames.js/next/server";
import type { Metadata } from "next";
import { DEBUG_HUB_OPTIONS } from "../../debug/constants";
import { getCollection } from "./lib/collection";
import { State } from "./lib/types";
import { CheckPage } from "./pages/check";
import { ConfirmPage } from "./pages/confirm";
import { InitialPage } from "./pages/initial";
import { RelayPage } from "./pages/relay";
import { StartPage } from "./pages/start";

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getCollection();

  return {
    title: name,
    description: "Check if you're eligible for a free mint",
  };
}

const initialState: State = { page: "initial" };

const reducer: FrameReducer<State> = (state, action) => {
  if (!action.postBody) {
    return { page: "initial" };
  }

  const decodedMessage = Message.decode(
    Buffer.from(action.postBody.trustedData.messageBytes, "hex")
  ) as FrameActionMessage;

  const { buttonIndex } = decodedMessage.data.frameActionBody || {};

  let nextState: State;

  if (state.page === "initial") {
    nextState = { page: "start" };
  } else if (state.page === "select-address") {
    nextState = { page: "confirm" };
  } else if (state.page === "confirm") {
    if (buttonIndex === 1) {
      // Back
      nextState = { page: "start" };
    } else {
      // Mint
      nextState = { page: "relay" };
    }
  } else if (state.page === "check") {
    nextState = { page: "check" };
  } else {
    nextState = state;
  }

  console.log("Reduced state", { state, nextState });

  return nextState;
};

export default async function Page({ searchParams }: NextServerPageProps) {
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

  console.log("Rendering with state", { state });

  const { name, image, address, tokenId } = await getCollection();

  const baseContainerProps = {
    state,
    previousFrame,
    postUrl: "/examples/base-mint-with-warps/frames",
    pathname: "/examples/base-mint-with-warps",
  };

  if (frameMessage) {
    const containerProps = {
      ...baseContainerProps,
      frameMessage: frameMessage!,
    };

    if (state.page === "start") {
      return <StartPage {...containerProps}></StartPage>;
    } else if (state.page === "confirm") {
      return <ConfirmPage {...containerProps}></ConfirmPage>;
    } else if (state.page === "relay") {
      return <RelayPage {...containerProps}></RelayPage>;
    } else if (state.page === "check") {
      return <CheckPage {...containerProps}></CheckPage>;
    } else {
      return <InitialPage {...containerProps}></InitialPage>;
    }
  }

  return (
    <div>
      <InitialPage {...baseContainerProps}></InitialPage>

      <div className="flex flex-col md:flex-row md:items-center justify-center min-h-screen items-start font-body">
        <div className="w-full md:w-3/4 flex justify-center items-center">
          <img
            src={image}
            alt={name}
            className="w-full lg:max-w-[800px] md:max-w-[400px] h-auto"
          />
        </div>
        <div className="w-full md:w-1/4 flex flex-col items-center md:items-start space-y-4 mt-4 md:mt-0 md:pl-4">
          <h1 className="text-2xl font-bold">{name}</h1>
          <a
            href={`https://zora.co/collect/base:${address}/${tokenId}`}
            target="_blank"
          >
            <button className="px-4 py-2 bg-violet-500 text-white hover:bg-violet-700 transition duration-300">
              Mint on Zora
            </button>
          </a>
          <div className="text-xs text-stone-400 hover:underline tracking-tighter text-center">
            <a
              href="https://github.com/framesjs/frames.js/tree/main/examples/framesjs-starter/app/examples/base-mint-with-warps"
              target="_blank"
            >
              See code on Github
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
