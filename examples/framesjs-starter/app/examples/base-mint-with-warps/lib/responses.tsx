import { NextResponse } from "next/server";
import {
  NEXT_PUBLIC_URL,
  ZORA_COLLECTION_ADDRESS,
  ZORA_TOKEN_ID,
} from "../config";
import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameState,
  PreviousFrame,
} from "frames.js/next/server";
import { Card } from "../components/Card";
import { FramePageProps } from "./types";

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
        mint={`eip155:8453:${ZORA_COLLECTION_ADDRESS}:${ZORA_TOKEN_ID}`}
      >
        Mint
      </FrameButton>
    </FrameContainer>
  );
}
