import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js State via Query params example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/state-via-query-params/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Frames.js State via Query params example <DebugLink />
    </div>
  );
}
