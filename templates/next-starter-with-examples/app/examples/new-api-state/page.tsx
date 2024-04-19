import Link from "next/link";
import { currentURL, vercelURL } from "../../utils";
import { createDebugUrl } from "../../debug";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "New api example with state management",
    description: "This is a new api example with state management",
    other: {
      ...(await fetchMetadata(
        new URL(
          "/examples/new-api-state/frames",
          vercelURL() || "http://localhost:3000"
        )
      )),
    },
  };
}

export default async function Home() {
  const url = currentURL("/examples/new-api-state");

  return (
    <div>
      State Management
      <Link href={createDebugUrl(url)} className="underline">
        Debug
      </Link>
    </div>
  );
}
