import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Inline images Frames.js example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/inline-images/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Basic Frames.js example. <DebugLink />
    </div>
  );
}
