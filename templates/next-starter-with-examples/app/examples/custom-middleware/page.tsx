import { createExampleURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { Frame } from "../../components/Frame";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Custom Middleware Example",
    other: {
      ...(await fetchMetadata(
        createExampleURL("/examples/custom-middleware/frames")
      )),
    },
  };
}

export default async function Home() {
  const metadata = await generateMetadata();

  return (
    <Frame
      metadata={metadata}
      url={createExampleURL("/examples/custom-middleware/frames")}
    />
  );
}
