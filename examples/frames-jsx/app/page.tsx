import { FFrame, FFrameImage, FFrameButton } from "frames.js";

export default async function Home({
  searchParams: frameState,
}: {
  searchParams: Record<string, string>;
}) {
  // Do a server side side effect either sync or async, such as minting an NFT
  if (frameState.x === "boris") {
    // example: load the users credentials & check they have an NFT
    await Promise.resolve();
  }

  // return next frame
  return (
    <FFrame postUrl="">
      <FFrameImage src="https://picsum.photos/seed/frames.js/1146/600" />
      <FFrameButton onClick={() => ({ ...frameState, x: "1" })}>
        {frameState?.x === "1" ? "Active" : "Inactive"}
      </FFrameButton>
      <FFrameButton onClick={() => ({ x: "2" })}>
        {frameState?.x === "2" ? "Active" : "Inactive"}
      </FFrameButton>
      <FFrameButton onClick={() => ({ y: "hello" })}>
        {frameState?.y === "hello" ? "Active" : "Inactive"}
      </FFrameButton>
      <FFrameButton onClick={() => ({ x: "boris" })}>
        {frameState?.x === "boris" ? "Active" : "Inactive"}
      </FFrameButton>
    </FFrame>
  );
}
