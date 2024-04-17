import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "New api example",
    description: "This is a new api example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/new-api-only-followers-can-mint/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      New api example only followers can mint. <DebugLink />
    </div>
  );
}
