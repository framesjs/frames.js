import type { InferGetServerSidePropsType, GetServerSideProps } from "next";
import Head from "next/head";
import {
  fetchMetaData,
  metaDataToMetaTags,
} from "@frames.js/next/pages-router";
import Link from "next/link";
import { createDebugUrl } from "../../app/debug";

export const getServerSideProps = async function getServerSideProps() {
  return {
    props: {
      metadata: await fetchMetaData(
        new URL(
          "/api/frames",
          process.env.VERCEL_URL || "http://localhost:3000"
        )
      ),
    },
  };
} satisfies GetServerSideProps<{
  metadata: Awaited<ReturnType<typeof fetchMetaData>>;
}>;

export default function Page({
  metadata,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Frames.js app</title>
        {metaDataToMetaTags(metadata)}
      </Head>

      <div>
        Next.js Page Router example{" "}
        <Link
          href={createDebugUrl("http://localhost:3000/page-router")}
          className="underline"
        >
          Debug
        </Link>
      </div>
    </>
  );
}
