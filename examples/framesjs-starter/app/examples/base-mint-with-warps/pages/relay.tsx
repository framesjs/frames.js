import { kv } from "@vercel/kv";
import { FrameButton, FrameContainer, FrameImage } from "frames.js/next/server";
import { FrameState } from "frames.js/next/types";
import { Card } from "../components/Card";
import { ErrorFrame, MintFrame } from "../lib/responses";
import signMintData from "../lib/signMint";
import { FramePageProps, Session } from "../lib/types";
import { isPrime } from "../lib/utils";
import { SYNDICATE_API_KEY } from "../config";

export async function RelayPage<T extends FrameState = FrameState>(
  props: FramePageProps
) {
  const isFidPrime = isPrime(props.frameMessage.requesterFid);
  const fid = props.frameMessage.requesterFid;

  let session = ((await kv.get(`session:${fid}`)) ?? {}) as Session;

  console.log({ session, isFidPrime });

  if (isFidPrime && session?.address) {
    const { address } = session;
    const sig = await signMintData({
      to: address,
      tokenId: 1,
      fid,
    });
    const res = await fetch("https://frame.syndicate.io/api/mint", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${SYNDICATE_API_KEY}`,
      },
      body: JSON.stringify({
        frameTrustedData:
          props.previousFrame.postBody!.trustedData.messageBytes,
        args: [address, 1, fid, sig],
      }),
    });
    if (res.status === 200) {
      const {
        success,
        data: { transactionId },
      } = await res.json();
      if (success) {
        session = { ...session, transactionId };
        await kv.set(`session:${fid}`, session);
        const res = await fetch(
          `https://frame.syndicate.io/api/transaction/${transactionId}/hash`,
          {
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${SYNDICATE_API_KEY}`,
            },
          }
        );
        if (res.status === 200) {
          return (
            <FrameContainer {...props} state={{ page: "check" }}>
              <FrameImage aspectRatio="1:1">
                <Card message="Your mint transaction is in the queue." />
              </FrameImage>
              <FrameButton>🔄 Check status</FrameButton>
            </FrameContainer>
          );
        }
      }
    }
    return <ErrorFrame {...props}></ErrorFrame>;
  } else {
    return <MintFrame {...props}></MintFrame>;
  }
}
