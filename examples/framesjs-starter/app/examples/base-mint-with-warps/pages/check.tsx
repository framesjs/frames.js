import { kv } from "@vercel/kv";
import { FrameButton, FrameContainer, FrameImage } from "frames.js/next/server";
import { FrameState } from "frames.js/next/types";
import { Card } from "../components/Card";
import { ErrorFrame, MintFrame } from "../lib/responses";
import signMintData from "../lib/signMint";
import { FramePageProps, Session } from "../lib/types";
import { isPrime } from "../lib/utils";
import { SYNDICATE_API_KEY } from "../config";

export async function CheckPage<T extends FrameState = FrameState>(
  props: FramePageProps
) {
  const isFidPrime = isPrime(props.frameMessage.requesterFid);

  if (isFidPrime) {
    const fid = props.frameMessage.requesterFid;
    let session = ((await kv.get(`session:${fid}`)) ?? {}) as Session;
    const { address, transactionId, checks, retries } = session;
    const totalChecks = checks ?? 0;
    const totalRetries = retries ?? 0;

    // If we've retried 3 times, give up
    if (totalRetries > 2) {
      return <ErrorFrame {...props}></ErrorFrame>;
    }

    // If we've checked 3 times, try to mint again
    if (totalChecks > 2 && session.address) {
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
            props.previousFrame.postBody?.trustedData?.messageBytes,
          args: [address, 1, fid, sig],
        }),
      });
      if (res.status === 200) {
        const {
          success,
          data: { transactionId },
        } = await res.json();
        if (success) {
          session = {
            ...session,
            transactionId,
            checks: 0,
            retries: totalRetries + 1,
          };
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
    }
    // If we have a transactionId, check the status
    if (transactionId) {
      await kv.set(`session:${fid}`, { ...session, checks: totalChecks + 1 });
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
        const {
          data: { transactionHash },
        } = await res.json();
        if (transactionHash) {
          await kv.set(`session:${fid}`, { ...session, transactionHash });
          return (
            <FrameContainer {...props}>
              <FrameImage aspectRatio="1:1">
                <Card message={`Minted to: ${address}`} />
              </FrameImage>
              <FrameButton href={`https://basescan.org/tx/${transactionHash}`}>
                Transaction
              </FrameButton>
            </FrameContainer>
          );
        } else {
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
