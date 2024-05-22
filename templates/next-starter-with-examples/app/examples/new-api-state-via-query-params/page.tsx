import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "New api example with state via query params",
    description: "This is a new api example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/new-api-state-via-query-params/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      State via Query params example <DebugLink />
    </div>
  );
}
