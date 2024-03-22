import Link from "next/link";
import { currentURL, vercelURL } from "../../utils";
import { createDebugUrl } from "../../debug";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "New api example",
    description: "This is a new api example",
    other: {
      ...(await fetchMetadata(
        new URL(
          "/examples/new-api-mint-button/frames",
          vercelURL() || "http://localhost:3000"
        )
      )),
    },
  };
}

export default async function Home() {
  const url = currentURL("/examples/new-api-mint-button");

  return (
    <div>
      New api mint button example.{" "}
      <Link href={createDebugUrl(url)} className="underline">
        Debug
      </Link>
    </div>
  );
}
