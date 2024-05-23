import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Multi protocol Example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/multi-protocol/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Frames.js Multi protocol example <DebugLink />
    </div>
  );
}
