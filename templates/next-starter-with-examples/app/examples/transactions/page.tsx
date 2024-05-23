import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Transactions example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/transactions/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Frames.js Transactions example rent farcaster storage example{" "}
      <DebugLink />
    </div>
  );
}
