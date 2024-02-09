import { FrameState } from 'frames.js/next/types';
import { FramePageProps } from '../lib/types';
import { FrameButton, FrameContainer, FrameImage } from 'frames.js/next/server';
import { Card } from '../components/Card';
import { kv } from '@vercel/kv';
import { MintFrame } from '../lib/responses';
import { isPrime } from '../lib/utils';

export async function ConfirmPage<T extends FrameState = FrameState>(props: FramePageProps) {
  const isFidPrime = isPrime(props.frameMessage.requesterFid);

  // TODO: Get verified addresses and custody address
  const addresses = props.frameMessage.requesterVerifiedAddresses;
  const selectedAddress = addresses[props.frameMessage.buttonIndex - 1];

  if (isFidPrime) {
    await kv.set(`session:${props.frameMessage.requesterFid}`, {
      address: selectedAddress,
    });

    return (
      <FrameContainer {...props} state={{ page: 'confirm' }}>
        <FrameImage aspectRatio="1:1">
          <Card message={`Mint to ${selectedAddress}?`} />
        </FrameImage>
        <FrameButton>⬅️ Back</FrameButton>
        <FrameButton>✅ Mint</FrameButton>
      </FrameContainer>
    );
  } else {
    return <MintFrame {...props}></MintFrame>;
  }
}
