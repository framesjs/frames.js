import { createExampleURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { Frame } from "../../components/Frame";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Cast Actions example",
    other: {
      ...(await fetchMetadata(
        createExampleURL("/examples/cast-actions/frames")
      )),
    },
  };
}

export default async function Home() {
  const metadata = await generateMetadata();

  return (
    <Frame
      metadata={metadata}
      url={createExampleURL("/examples/cast-actions/frames")}
    />
  );
}
