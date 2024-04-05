import type { Metadata } from "next";
import React from "react";

// do not use barrel file e.g. import '../core' or export { something } from '../core' as it 
// produces unnecessary imports that can break next.js client side build because server side stuff leaks
// into the build and tree shaking is not able to get rid of it
export type * as types from "../../core/types";
export { fetchMetadata } from "../fetchMetadata";

/**
 * Converts metadata returned from fetchMetadata() call to Next.js <Head /> compatible components.
 *
 * @example
 * ```tsx
 * import { fetchMetadata, metadataToMetaTags } from "frames.js/next/pages-router/client";
 *
 * export async function getServerSideProps() {
 *  return {
 *   props: {
 *    metadata: await fetchMetadata(
 *     new URL("/api", process.env.VERCEL_URL || "http://localhost:3000")
 *    ),
 *  },
 * };
 *
 * export default function Page({
 *  metadata,
 * }: InferGetServerSidePropsType<typeof getServerSideProps>) {
 *  return (
 *    <>
 *      <Head>
 *        <title>Frames.js app</title>
 *        {metadataToMetaTags(metadata)}
 *      </Head>
 *    </>
 *  );
 * }
 * ```
 */
export function metadataToMetaTags(
  metadata: NonNullable<Metadata["other"]>
): JSX.Element {
  return (
    <>
      {Object.entries(metadata).map(([key, value]) => {
        if (typeof value === "string") {
          return <meta name={key} key={key} content={value} />;
        }

        return null;
      })}
    </>
  );
}
