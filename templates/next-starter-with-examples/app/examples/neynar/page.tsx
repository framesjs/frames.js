import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Neynar Validate Example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/neynar/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Neynar Validate example <DebugLink />
    </div>
  );
}
