import { createExampleURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { Frame } from "../../components/Frame";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Post Redirect Example",
    other: {
      ...(await fetchMetadata(
        createExampleURL("/examples/post-redirect/frames")
      )),
    },
  };
}

export default async function Home() {
  const metadata = await generateMetadata();

  return (
    <Frame
      metadata={metadata}
      url={createExampleURL("/examples/post-redirect/frames")}
    />
  );
}
