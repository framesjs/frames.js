import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Error Message handling example",
    description: "This is a new api example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/error-handling/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Frame.js Error Message handling example. <DebugLink />
    </div>
  );
}
