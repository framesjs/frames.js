import { createExampleURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { Frame } from "../../components/Frame";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Error Message handling example",
    description: "This is a new api example",
    other: {
      ...(await fetchMetadata(
        createExampleURL("/examples/error-handling/frames")
      )),
    },
  };
}

export default async function Home() {
  const metadata = await generateMetadata();

  return (
    <Frame
      metadata={metadata}
      url={createExampleURL("/examples/error-handling/frames")}
    />
  );
}
