import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Composer Actions example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/composer-actions/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Frames.js Composer Actions example <DebugLink />
    </div>
  );
}
