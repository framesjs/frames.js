import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Basic Frames.js example",
    other: {
      ...(await fetchMetadata(new URL("/examples/basic/frames", appURL()))),
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
