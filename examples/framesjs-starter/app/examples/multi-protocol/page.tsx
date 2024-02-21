import { ClientProtocolId } from "frames.js";
import {
  FrameButton,
  FrameContainer,
  FrameImage,
  NextServerPageProps,
  getFrameMessage,
  getPreviousFrame,
} from "frames.js/next/server";
import { getXmtpFrameMessage, isXmtpFrameActionPayload } from "frames.js/xmtp";
import { DEBUG_HUB_OPTIONS } from "../../debug/constants";

const acceptedProtocols: ClientProtocolId[] = [
  {
    id: "xmtp",
    version: "vNext",
  },
  {
    id: "farcaster",
    version: "vNext",
  },
];

// This is a react server component only
export default async function Home({
  params,
  searchParams,
}: NextServerPageProps) {
  const previousFrame = getPreviousFrame(searchParams);

  let fid: number | undefined;
  let walletAddress: string | undefined;

  if (
    previousFrame.postBody &&
    isXmtpFrameActionPayload(previousFrame.postBody)
  ) {
    const frameMessage = await getXmtpFrameMessage(previousFrame.postBody);
    walletAddress = frameMessage?.verifiedWalletAddress;
  } else {
    const frameMessage = await getFrameMessage(
      previousFrame.postBody,
      DEBUG_HUB_OPTIONS
    );

    if (frameMessage && frameMessage?.isValid) {
      fid = frameMessage?.requesterFid;
      walletAddress =
        frameMessage?.requesterCustodyAddress.length > 0
          ? frameMessage?.requesterCustodyAddress
          : frameMessage.requesterCustodyAddress;
    }
  }

  return (
    <div>
      <FrameContainer
        pathname="/examples/multi-protocol"
        postUrl="/examples/multi-protocol/frames"
        state={{}}
        previousFrame={previousFrame}
        accepts={acceptedProtocols}
      >
        <FrameImage>
          <div tw="flex flex-col">
            <div tw="flex">
              This frame gets the interactor&apos;s wallet address or FID
              depending on the client protocol.
            </div>
            {fid && <div tw="flex">FID: {fid}</div>}
            {walletAddress && (
              <div tw="flex">Wallet Address: {walletAddress}</div>
            )}
          </div>
        </FrameImage>
        <FrameButton>Check</FrameButton>
      </FrameContainer>
    </div>
  );
}
