import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Cache Control example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/cache-control/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Frames.js Cache Control example <DebugLink />
    </div>
  );
}
