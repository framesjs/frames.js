import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Custom Middleware Example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/custom-middleware/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Frames.js Custom Middleware example <DebugLink />
    </div>
  );
}
