import { kv } from '@vercel/kv';
import { FrameButton, FrameContainer, FrameImage } from 'frames.js/next/server';
import { FrameState } from 'frames.js/next/types';
import { Card } from '../components/Card';
import { ZORA_COLLECTION_ADDRESS, ZORA_TOKEN_ID } from '../config';
import { MintFrame } from '../lib/responses';
import { FramePageProps, Session } from '../lib/types';
import { getAddressWithTypeForFid, isPrime } from '../lib/utils';

export async function StartPage<T extends FrameState = FrameState>(props: FramePageProps) {
  const isFidPrime = isPrime(props.frameMessage.requesterFid);

  if (isFidPrime) {
    const fid = props.frameMessage.requesterFid;
    const { transactionId, transactionHash } = ((await kv.get(`session:${fid}`)) ?? {}) as Session;
    if (transactionHash) {
      return (
        <FrameContainer {...props}>
          <FrameImage aspectRatio="1:1">
            <Card message="You've already claimed, but you can mint with Warps." />
          </FrameImage>
          <FrameButton href={`https://basescan.org/tx/${transactionHash}`}>Transaction</FrameButton>
          <FrameButton mint={`eip155:8453:${ZORA_COLLECTION_ADDRESS}:${ZORA_TOKEN_ID}`}>
            Mint
          </FrameButton>
        </FrameContainer>
      );
    } else if (transactionId) {
      // Mint in queue
      return (
        <FrameContainer {...props} state={{ page: 'check' }}>
          <FrameImage aspectRatio="1:1">
            <Card message="Your mint transaction is in the queue." />
          </FrameImage>
          <FrameButton>🔄 Check status</FrameButton>
        </FrameContainer>
      );
    } else {
      const { address, isCustody } = await getAddressWithTypeForFid(
        props.frameMessage.requesterFid,
      );
      return (
        <FrameContainer {...props} state={{ page: 'select-address' }}>
          <FrameImage aspectRatio="1:1">
            <Card message="You're eligible for a free mint. Select an address:" />
          </FrameImage>
          <FrameButton>{`${isCustody ? '🟣' : '🟢'} ${address.slice(0, 6)}`}</FrameButton>
        </FrameContainer>
      );
    }
  } else {
    return <MintFrame {...props} />;
  }
}
