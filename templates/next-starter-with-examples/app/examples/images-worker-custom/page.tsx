import { appURL } from "../../utils";
import type { Metadata } from "next";
import { fetchMetadata } from "frames.js/next";
import { DebugLink } from "../../components/DebugLink";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Frames.js Image Worker (Custom) example",
    other: {
      ...(await fetchMetadata(
        new URL("/examples/images-worker-custom/frames", appURL())
      )),
    },
  };
}

export default async function Home() {
  return (
    <div>
      Frames.js Image Worker (Custom) example <DebugLink />
    </div>
  );
}
