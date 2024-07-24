import { fetchMetadata } from "frames.js/next";
import type { Metadata } from "next";
import Link from "next/link";
import { createExampleURL } from "./utils";
import { Frame } from "./components/Frame";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "frames.js starter",
    description: "This is a frames.js starter template",
    other: {
      ...(await fetchMetadata(createExampleURL("/frames"))),
    },
  };
}

// This is a react server component only
export default async function Home() {
  const metadata = await generateMetadata();

  // then, when done, return next frame
  return (
    <div className="flex flex-col max-w-[600px] w-full gap-2 mx-auto p-2">
      <div className="pb-4">
        frames.js starter kit. The Template Frame is on this page, it&apos;s in
        the html meta tags (inspect source).
      </div>
      <Frame metadata={metadata} url={createExampleURL("/frames")} />
      <div className="flex w-full">
        <Link href="/examples" className="underline ml-auto">
          See other examples
        </Link>
      </div>
    </div>
  );
}
