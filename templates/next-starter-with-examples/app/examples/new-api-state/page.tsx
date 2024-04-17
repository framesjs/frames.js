import { vercelURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

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
  return (
    <div>
      State Management <DebugLink />
    </div>
  );
}
