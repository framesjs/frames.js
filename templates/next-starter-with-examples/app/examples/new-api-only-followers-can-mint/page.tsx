import Link from "next/link";
import { currentURL, appURL } from "../../utils";
import { createDebugUrl } from "../../debug";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";

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
  const url = currentURL("/examples/new-api-only-followers-can-mint");

  return (
    <div>
      New api example only followers can mint.{" "}
      <Link href={createDebugUrl(url)} className="underline">
        Debug
      </Link>
    </div>
  );
}
