import { FrameButton, FrameContainer, FrameImage } from "frames.js/next/server";
import { Card } from "../components/Card";
import { FramePageProps } from "../lib/types";

export async function InitialPage(props: Omit<FramePageProps, "frameMessage">) {
  return (
    <FrameContainer {...props}>
      <FrameImage aspectRatio="1:1">
        <Card message="Claim free if your FID is a prime number or mint with Warps." />
      </FrameImage>
      <FrameButton>Check eligibility</FrameButton>
    </FrameContainer>
  );
}
