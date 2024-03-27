import { getTokenUrl } from "frames.js";
import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameReducer,
  NextServerPageProps,
  getPreviousFrame,
  useFramesReducer,
} from "frames.js/next/server";
import Link from "next/link";
import { zora } from "viem/chains";
import { currentURL } from "../../utils";
import { createDebugUrl } from "../../debug";

type State = {
  pageIndex: number;
};

const nfts: {
  src: string;
  tokenUrl: string;
}[] = [
  {
    src: "https://ipfs.decentralized-content.com/ipfs/bafybeifs7vasy5zbmnpixt7tb6efi35kcrmpoz53d3vg5pwjz52q7fl6pq/cook.png",
    tokenUrl: getTokenUrl({
      address: "0x99de131ff1223c4f47316c0bb50e42f356dafdaa",
      chain: zora,
      tokenId: "2",
    }),
  },
  {
    src: "https://remote-image.decentralized-content.com/image?url=https%3A%2F%2Fipfs.decentralized-content.com%2Fipfs%2Fbafybeiegrnialwu66u3nwzkn4gik4i2x2h4ip7y3w2dlymzlpxb5lrqbom&w=1920&q=75",
    tokenUrl: getTokenUrl({
      address: "0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df",
      chain: zora,
      tokenId: "1",
    }),
  },
  {
    src: "https://remote-image.decentralized-content.com/image?url=https%3A%2F%2Fipfs.decentralized-content.com%2Fipfs%2Fbafybeidc6e5t3qmyckqh4fr2ewrov5asmeuv4djycopvo3ro366nd3bfpu&w=1920&q=75",
    tokenUrl: getTokenUrl({
      address: "0x8f5ed2503b71e8492badd21d5aaef75d65ac0042",
      chain: zora,
      tokenId: "3",
    }),
  },
];
const initialState: State = { pageIndex: 0 };

const reducer: FrameReducer<State> = (state, action) => {
  const buttonIndex = action.postBody?.untrustedData.buttonIndex;

  return {
    pageIndex: buttonIndex
      ? (state.pageIndex + (buttonIndex === 2 ? 1 : -1)) % nfts.length
      : state.pageIndex,
  };
};

// This is a react server component only
export default async function Home({ searchParams }: NextServerPageProps) {
  const url = currentURL("/examples/mint-button");
  const previousFrame = getPreviousFrame<State>(searchParams);
  const [state] = useFramesReducer<State>(reducer, initialState, previousFrame);

  // then, when done, return next frame
  return (
    <div>
      Mint button example <Link href={createDebugUrl(url)}>Debug</Link>
      <FrameContainer
        pathname="/examples/mint-button"
        postUrl="/examples/mint-button/frames"
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage
          src={nfts[state.pageIndex]!.src}
          aspectRatio="1:1"
        ></FrameImage>
        <FrameButton>←</FrameButton>
        <FrameButton>→</FrameButton>
        <FrameButton action="mint" target={nfts[state.pageIndex]!.tokenUrl}>
          Mint
        </FrameButton>
      </FrameContainer>
    </div>
  );
}
