import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Post Redirect Example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/post-redirect/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Frames.js Post Redirect Example <DebugLink />
    </div>
  );
}
