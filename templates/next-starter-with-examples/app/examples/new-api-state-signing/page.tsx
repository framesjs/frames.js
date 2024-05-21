import { currentURL, appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "New api example with state signing",
    description: "This is a new api example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/new-api-state-signing/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  const url = currentURL("/examples/new-api-state-signing");

  return (
    <div>
      State signing <DebugLink></DebugLink>
    </div>
  );
}
