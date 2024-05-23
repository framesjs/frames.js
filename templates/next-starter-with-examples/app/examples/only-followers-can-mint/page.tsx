import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Only Followers Can Mint Example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/only-followers-can-mint/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Frames.js Only Followers Can Mint Example <DebugLink />
    </div>
  );
}
