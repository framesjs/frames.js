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
import { currentURL } from "../../utils";
import { DEFAULT_DEBUGGER_HUB_URL, createDebugUrl } from "../../debug";
import Link from "next/link";

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
export default async function Home({ searchParams }: NextServerPageProps) {
  const url = currentURL("/examples/multi-protocol");
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
    const frameMessage = await getFrameMessage(previousFrame.postBody, {
      hubHttpUrl: DEFAULT_DEBUGGER_HUB_URL,
    });

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
      Multi-protocol example{" "}
      <Link className="underline" href={createDebugUrl(url)}>
        Debug
      </Link>
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
