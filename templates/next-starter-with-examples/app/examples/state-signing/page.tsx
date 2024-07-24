import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { Frame } from "../../components/Frame";
import { createExampleURL } from "../../utils";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js State Signing example",
    other: {
      ...(await fetchMetadata(
        createExampleURL("/examples/state-signing/frames")
      )),
    },
  };
}

export default async function Home() {
  const metadata = await generateMetadata();

  return (
    <Frame
      metadata={metadata}
      url={createExampleURL("/examples/state-signing/frames")}
    />
  );
}
