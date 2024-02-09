import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameState,
} from "frames.js/next/server";
import { Card } from "../components/Card";
import { ZORA_COLLECTION_ADDRESS, ZORA_TOKEN_ID } from "../config";
import { FramePageProps } from "./types";
import { getTokenUrl } from "frames.js";

export async function ErrorFrame<T extends FrameState = FrameState>(
  props: FramePageProps
) {
  return (
    <FrameContainer {...props}>
      <FrameImage aspectRatio="1:1">
        <Card message="Something went wrong. Try again later." />
      </FrameImage>
      <FrameButton>Error</FrameButton>
    </FrameContainer>
  );
}

export async function MintFrame<T extends FrameState = FrameState>(
  props: FramePageProps
) {
  return (
    <FrameContainer {...props}>
      <FrameImage aspectRatio="1:1">
        <Card message="You don't have a prime FID. You can mint with Warps below." />
      </FrameImage>
      <FrameButton
        mint={getTokenUrl({
          address: ZORA_COLLECTION_ADDRESS!,
          chainId: 8453,
          tokenId: ZORA_TOKEN_ID,
        })}
      >
        Mint
      </FrameButton>
    </FrameContainer>
  );
}
