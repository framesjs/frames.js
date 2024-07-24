import type { InferGetServerSidePropsType, GetServerSideProps } from "next";
import Head from "next/head";
import {
  fetchMetadata,
  metadataToMetaTags,
} from "frames.js/next/pages-router/client";
import { DebugLink } from "../../../app/components/DebugLink";

export const getServerSideProps = async function getServerSideProps() {
  const url = new URL(
    "/api/frames",
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  );

  return {
    props: {
      url: url.toString(),
      metadata: await fetchMetadata(url),
    },
  };
} satisfies GetServerSideProps<{
  metadata: Awaited<ReturnType<typeof fetchMetadata>>;
  url: string;
}>;

export default function Page({
  metadata,
  url,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Frames.js app</title>
        {metadataToMetaTags(metadata)}
      </Head>

      <div>
        Next.js Page Router example <DebugLink url={url} />
      </div>
    </>
  );
}
