import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Custom font Example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/custom-font/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Frames.js Custom font example <DebugLink />
    </div>
  );
}
