/* eslint-disable react/jsx-key */
import { Button, createFrames } from "frames.js/next";
import { getTokenUrl } from "frames.js";
import { zora } from "viem/chains";

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

const frames = createFrames({
  basePath: "/examples/new-api-mint-button/frames",
});

const handleRequest = frames(async (ctx) => {
  const page = Number(ctx.searchParams?.pageIndex ?? 0);
  return {
    image: nfts[page]!.src,
    imageOptions: {
      aspectRatio: "1:1",
    },
    buttons: [
      <Button
        action="post"
        target={{
          query: {
            pageIndex: String((page - 1) % nfts.length),
          },
        }}
      >
        ←
      </Button>,
      <Button
        action="post"
        target={{
          query: {
            pageIndex: String((page + 1) % nfts.length),
          },
        }}
      >
        →
      </Button>,
      <Button action="mint" target={nfts[page]!.tokenUrl}>
        Mint
      </Button>,
    ],
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
